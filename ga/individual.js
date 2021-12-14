import { random } from "../random.js";
import { createInnerDBs } from "../sqd/layout.js";
import { run } from "../truth/runner.js";

export class Individual {
  /**
   *
   * @param {number} width
   * @param {number} height
   * @param {number[]} [geneticCode]
   */
  constructor(width, height, geneticCode) {
    this.dirty = true;
    this.fitness = 0;
    this.width = width;
    this.height = height;
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
      simParams: { mu: "-0.32", num_instances: "-1" },
      failFast: false,
      retainSimulationFiles: false,
      generateSiQADResult: true,
    });
    this.results = results;
    this.fitness = results.score;
    this.dirty = false;
    return this.fitness;
  }

  mutate() {
    const genetic = [...this.geneticCode];
    const idx = Math.floor(random.double() * genetic.length);
    genetic[idx] = (genetic[idx] + (random.double() < 0.5) + 1) % 3;
    return new Individual(this.width, this.height, genetic);
  }

  /**
   * @param {Individual} other
   */
  crossover(other) {
    const genetic = [];
    const idx = Math.floor(random.double() * this.geneticCode.length);
    genetic.push(...this.geneticCode.slice(0, idx));
    genetic.push(...other.geneticCode.slice(idx));
    return new Individual(this.width, this.height, genetic);
  }
}
