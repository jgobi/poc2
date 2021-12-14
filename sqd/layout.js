import { randomBytes } from "crypto";

const colorSortFn = (a, b) =>
  a.color.toLowerCase().localeCompare(b.color.toLowerCase());

/**
 *
 * @param {import('../types').DB[]} dbs
 * @returns {import('../types').ParsedDBs}
 */
function parseDBs(dbs) {
  const inputs = [],
    flatOutputs = [],
    outputs = [],
    area = [],
    fixed = [];

  for (const db of dbs) {
    const c = db.color.toLowerCase();
    if (c === "#ff00ffff") {
      area.push(db);
    } else if (c.startsWith("#ffffff")) {
      inputs.push(db);
    } else if (c.startsWith("#ffff00")) {
      flatOutputs.push(db);
    } else {
      fixed.push(db);
    }
  }

  if (area.length !== 4) {
    throw new Error(
      "The inner area must be delimited by 4 DBs (colored with #ff00ffff)."
    );
  }
  if (inputs < 1) {
    throw new Error(
      "File must have at least 1 input DB (colored with #ffffffxx, where xx is the input number)."
    );
  }
  if (flatOutputs < 2) {
    throw new Error(
      "File must have at least 1 pair of output DB (colored with #ffff00xx, where xx is the output number)."
    );
  }
  if (flatOutputs % 2) {
    throw new Error("Outputs must be a pair of DBs.");
  }

  inputs.sort(colorSortFn);
  flatOutputs.sort(colorSortFn);
  for (let i = 0; i < flatOutputs.length; i += 2) {
    outputs.push([flatOutputs[i], flatOutputs[i + 1]]);
  }
  for (const dbPair of outputs) {
    const [a, b] = dbPair;
    if (a.n > b.n || a.m > b.m || (a.m === b.m && a.l > b.l)) {
      dbPair.reverse();
    }
  }

  area.sort((a, b) => a.m - b.m || a.n - b.n);

  return {
    inputs,
    outputs,
    flatOutputs,
    area,
    fixed,
  };
}

export class DBLayout {
  /**
   * @param {import('../types').DB[]} dbs
   */
  constructor(dbs) {
    this.id = randomBytes(8).toString("hex");
    const parsed = parseDBs(dbs);

    this.area = {
      width: parsed.area[3].n - parsed.area[0].n + 1,
      height: parsed.area[3].m - parsed.area[0].m + 1,
      m: { min: parsed.area[0].m, max: parsed.area[3].m },
      n: { min: parsed.area[0].n, max: parsed.area[3].n },
    };
    this.outputs = parsed.outputs;
    this.fixed = [...parsed.fixed, ...parsed.flatOutputs];
    this.fixed.forEach((db, i) => {
      db.index = i;
    });
    this.inputs = parsed.inputs;
    this.inputs.forEach((db) => {
      db.index = Infinity;
    });

    this.inner = [];
  }

  /**
   * @param {import('../types').DB[]} dbs
   */
  setInner(dbs) {
    for (const db of dbs) {
      if (
        db.m < this.area.m.min ||
        db.m > this.area.m.max ||
        db.n < this.area.n.min ||
        db.n > this.area.n.max
      )
        throw new OutOfBoundsError(db, area);
    }
    this.id = randomBytes(8).toString("hex");
    this.inner = dbs;
    this.inner.forEach((db, i) => (db.index = this.fixed.length + i));
  }

  /**
   *
   * @param {boolean[]} input
   * @returns {import('../types').DB[]}
   */
  getLayoutForGivenInput(input) {
    if (input.length !== this.inputs.length) {
      throw new Error(
        `Size of input array differs from layout (${input.length} != ${this.inputs.length}).`
      );
    }
    const inputDBs = this.inputs.filter((db, i) => input[i]);
    inputDBs.forEach((db, i) => {
      db.index = this.fixed.length + this.inner.length + i;
    });

    return [...this.fixed, ...this.inner, ...inputDBs];
  }

  /**
   *
   * @param {string} simulationResult
   */
  getOutputFromSimulationResult(simulationResult) {
    const results = simulationResult.split("");

    const output = [];
    for (const [o1, o2] of this.outputs) {
      if (results[o1.index] === results[o2.index]) output.push(null);
      else output.push(results[o2.index] === "-");
    }

    return output;
  }
}

/**
 *
 * @param {{n: number, m: number, l: number}[]} dbs
 * @returns {import('../types').DB[]}
 */
export function createInnerDBs(dbs) {
  return dbs.map(({ n, m, l }) => ({
    n,
    m,
    l,
    index: 0,
    color: "#ff01ffff", // cyan, but slightly different from the one used to delimit inner area
  }));
}

class OutOfBoundsError extends Error {
  constructor(db, area) {
    super("DB must be inside mutable area.");
    this.db = db;
    this.area = area;
  }
}
