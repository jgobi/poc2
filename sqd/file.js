import path from "path";
const __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

import { parseXML, stringifyXML } from "../xml.js";
import { DBLayout } from "./layout.js";
import fs from "fs";
import { promisify } from "util";
import { execFile as execFileCallback } from "child_process";
const execFile = promisify(execFileCallback);

import AdmZip from "adm-zip";

function generateSimulationParams({ mu = "-0.28" } = {}) {
  return {
    T_e_inv_point: "0.09995",
    T_init: "500",
    T_min: "2",
    T_schedule: "exponential",
    anneal_cycles: "10000",
    debye_length: "5",
    eps_r: "5.6",
    hop_attempt_factor: "5",
    muzm: "" + mu,
    num_instances: "-1",
    phys_validity_check_cycles: "10",
    reset_T_during_v_freeze_reset: "false",
    result_queue_size: "0.1",
    strategic_v_freeze_reset: "false",
    v_freeze_end_point: "0.4",
    v_freeze_init: "-1",
    v_freeze_reset: "-1",
    v_freeze_threshold: "4",
  };
}

export class SiQADFile {
  constructor() {
    this.path = null;
    this.layout = null;
    this.parsed = null;
  }

  /**
   *
   * @param {string} path
   */
  open(path) {
    this.path = path;
    const file = fs.readFileSync(path, "utf8");
    this.parsed = parseXML(file);
    const dbs = this.parsed?.siqad?.design?.layer
      ?.find((l) => l.$type === "DB")
      ?.dbdot?.map((db, index) => ({
        index,
        n: +db.latcoord.$n,
        m: +db.latcoord.$m,
        l: +db.latcoord.$l,
        color: db.color,
      }));

    this.layout = new DBLayout(dbs);
    return this.layout;
  }

  /**
   *
   * @param {boolean[]} input
   * @param {object} [simParams]
   * @returns
   */
  stringify(input, simParams) {
    const dbsIndex = this.parsed.siqad.design.layer.findIndex(
      (l) => l.$type === "DB"
    );
    const dbs = this.layout.getLayoutForGivenInput(input);
    this.parsed.siqad.design.layer[dbsIndex].dbdot = dbs.map((db) => ({
      layer_id: 2,
      latcoord: {
        $n: db.n,
        $m: db.m,
        $l: db.l,
      },
      physloc: {
        $x: (db.n * 384) / 100,
        $y: (db.m * 768 + db.l * 225) / 100,
      },
      color: db.color,
    }));

    if (simParams) {
      this.parsed.siqad.program.file_purpose = "simulation";
      this.parsed.siqad.sim_params = generateSimulationParams(simParams);
    } else {
      this.parsed.siqad.program.file_purpose = "save";
    }

    return stringifyXML(this.parsed);
  }

  reopen() {
    this.open(this.path);
  }

  /**
   *
   * @param {boolean[]} input
   * @param {string} path
   * @param {object} [simParams]
   */
  save(input, path, simParams) {
    fs.writeFileSync(path, this.stringify(input, simParams));
  }

  /**
   *
   * @param {object} params
   * @param {boolean[]} input
   */
  async runSimulation(
    input,
    params = { mu: "-0.32" },
    shouldGenerateSiQADResult = false
  ) {
    fs.mkdirSync("./simulation-files", { recursive: true });
    fs.mkdirSync("./simulation-results", { recursive: true });
    const fileName = `${path.basename(this.path, ".sqd")}--${
      this.layout.id
    }--${input.map((v) => +v).join("")}`;
    const inputFile = path.resolve(`./simulation-files/${fileName}.sqd`);
    const outputFile = path.resolve(`./simulation-results/${fileName}.xml`);

    this.save(input, inputFile, params);

    const { stdout, stderr } = await execFile(
      `${__dirname}/simanneal/simanneal`,
      [path.resolve(inputFile), outputFile]
    );
    const file = fs.readFileSync(outputFile, "utf8");
    const results = parseXML(file).sim_out.elec_dist.dist;

    const r = results
      .filter((e) => +e.$physically_valid === 1)
      .sort((a, b) => +a.$energy - +b.$energy)
      .shift();
    const simulationResult = {
      energy: +r.$energy,
      result: r["#text"],
      output: this.layout.getOutputFromSimulationResult(r["#text"]),
    };

    let siqadFile = null;
    if (shouldGenerateSiQADResult) {
      try {
        await generateSiQADResult(
          fileName,
          inputFile,
          outputFile,
          stdout,
          stderr
        );
      } catch (err) {
        console.error("Failed to create siqad output file, ignored.");
      }
    }

    return {
      inputFile,
      outputFile,
      siqadFile,
      stdout,
      simulationResult,
    };
  }
}

async function generateSiQADResult(name, problem, result, stdout, stderr) {
  fs.mkdirSync(`./simulation-results/${name}/step_0`, { recursive: true });
  fs.copyFileSync(
    problem,
    `./simulation-results/${name}/step_0/sim_problem_0.xml`
  );
  fs.copyFileSync(
    result,
    `./simulation-results/${name}/step_0/sim_result_0.xml`
  );
  fs.writeFileSync(
    `./simulation-results/${name}/step_0/runtime_stdout.log`,
    stdout
  );
  fs.writeFileSync(
    `./simulation-results/${name}/step_0/runtime_stderr.log`,
    stderr
  );
  fs.writeFileSync(
    `./simulation-results/${name}/manifest.xml`,
    stringifyXML({
      simjob: {
        name: `${name}`,
        state: "FinishedNormally",
        job_steps: {
          job_step: {
            placement: "0",
            state: "Running",
            command: {
              line: [
                `/tmp/siqad_ga/plugins/${name}/sim_problem_0.xml`,
                `/tmp/siqad_ga/plugins/${name}/sim_result_0.xml`,
              ],
            },
            step_dir: "step_0",
            problem_path: "step_0/sim_problem_0.xml",
            result_path: "step_0/sim_result_0.xml",
          },
        },
      },
    })
  );

  const zip = new AdmZip();
  zip.addLocalFolder(`./simulation-results/${name}`, `${name}`);
  await new Promise((resolve, reject) => {
    zip.writeZip(`./simulation-results/${name}.sqjx.zip`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  fs.rmSync(`./simulation-results/${name}`, { recursive: true });

  return path.resolve(`./simulation-results/${name}.sqjx.zip`);
}
