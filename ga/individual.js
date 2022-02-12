import { random } from "../random.js";
import { createInnerDBs } from "../sqd/layout.js";
import { run } from "../truth/runner.v2.js";

export class Individual {
  /**
   *
   * @param {number} width
   * @param {number} height
   * @param {import('../types').SimulationParameters} [simParams]
   * @param {number[]} [geneticCode]
   */
  constructor(width, height, simParams = {}, geneticCode) {
    this.dirty = true;
    this.fitness = 0;
    this.width = width;
    this.height = height;
    this.simParams = simParams;
    this.geneticCode =
      geneticCode ??
      Array(width * height)
        .fill(0)
        .map(() => {
          const r = random.double();
          return r < 0.9 ? 0 : r < 0.95 ? 1 : 2;
        });
    this.dbCount = this.geneticCode.reduce((acc, c) => acc + (c > 0), 0);
    this.id = null;
    this.results = null;
  }

  /**
   * @param {import('../sqd/layout').DBLayout} layout
   */
  getPhenotype(layout) {
    const { m, n } = layout.area;
    return this.geneticCode
      .map((v, i) =>
        !v
          ? null
          : {
              n: n.min + (i % this.width),
              m: m.min + Math.floor(i / this.width),
              l: v - 1,
            }
      )
      .filter((v) => v);
  }

  toString(showHelp = false) {
    return (
      (showHelp ? "○: empty, ◓: db up, ◒: db down\n" : "") +
      this.geneticCode
        .map(
          (v, i) =>
            (!i || i % this.width ? "" : "\n") +
            (v === 1 ? "◓" : v === 2 ? "◒" : "○")
        )
        .join(" ")
    );
  }

  /**
   * @param {import('../sqd/file').SiQADFile} file
   * @param {import('../types').TruthTable} truthTable
   */
  async getFitness(file, truthTable) {
    if (!this.dirty) return this.fitness;

    this.fitness = 0;
    const phenotype = this.getPhenotype(file.layout);
    file.layout.setInner(createInnerDBs(phenotype));
    this.id = file.layout.id;
    const results = await run(file, truthTable, {
      simParams: { mu: "-0.32", num_instances: "-1", ...this.simParams },
      failFast: false,
    });
    this.results = results;
    this.fitness = results.score;
    this.dirty = false;
    return this.fitness;
  }

  mutate() {
    if (random.double() < 0.4) {
      // one point mutation
      const genetic = [...this.geneticCode];
      const idx = Math.floor(random.double() * genetic.length);
      genetic[idx] = (genetic[idx] + (random.double() < 0.5) + 1) % 3;
      return new Individual(this.width, this.height, this.simParams, genetic);
    } else {
      // uniform mutation
      return new Individual(
        this.width,
        this.height,
        this.simParams,
        this.geneticCode.map((g) =>
          random.double() < 0.5 ? g : (g + (random.double() < 0.5) + 1) % 3
        )
      );
    }
  }

  /**
   * @param {Individual} other
   */
  crossover(other) {
    const genetic = [];

    if (random.double() < 0.4) {
      // one point crossover
      const idx = Math.floor(random.double() * this.geneticCode.length);
      genetic.push(...this.geneticCode.slice(0, idx));
      genetic.push(...other.geneticCode.slice(idx));
    } else {
      // uniform crossover
      const gens = [this.geneticCode, other.geneticCode];
      const geneticLength = this.geneticCode.length;
      for (let i = 0; i < geneticLength; i++) {
        genetic.push(gens[+(random.double() < 0.5)][i]);
      }
    }
    return new Individual(this.width, this.height, this.simParams, genetic);
  }
}
