import { random } from "../random.js";
import { Individual } from "./individual.js";

export class GeneticAlgorithm {
  constructor(populationSize, mutationRate, crossoverRate, elitismCount) {
    /** @type {Individual[]} */
    this.population = [];
    this.populationSize = populationSize;

    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
    this.elitismCount = elitismCount;
    this.dirty = true;

    this.generationCount = 0;
  }

  /**
   *
   * @param {number} width
   * @param {number} height
   * @param {import('../types').SimulationParameters} [simParams]
   */
  generatePopulation(width, height, simParams = {}) {
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push(new Individual(width, height, simParams));
    }
  }

  /**
   * @param {import('../sqd/file').SiQADFile} file
   * @param {import('../types').TruthTable} truthTable
   */
  async calculatePopulationFitness(file, truthTable) {
    if (!this.dirty) return;
    for (const ind of this.population) {
      await ind.getFitness(file, truthTable);
    }
    this.population.sort(
      (a, b) => b.fitness - a.fitness || a.dbCount - b.dbCount
    );
    this.dirty = false;
  }

  /**
   *
   * @param {import('../sqd/file').SiQADFile} file
   * @param {import('../types').TruthTable} truthTable
   * @returns {Promise<Individual>}
   */
  async getBestIndividual(file, truthTable) {
    await this.calculatePopulationFitness(file, truthTable);
    return this.population[0];
  }

  selectParent() {
    let max = this.population.reduce((acc, ind) => acc + ind.fitness, 0);
    let r = random.double() * max;
    let total = 0;
    for (const ind of this.population) {
      total += ind.fitness;
      if (r < total) return ind;
    }
  }

  nextGeneration() {
    this.generationCount++;
    this.dirty = true;

    // inclui elitismo
    const newPopulation = this.population.slice(0, this.elitismCount);
    for (let i = 0; i < this.populationSize - this.elitismCount; i++) {
      const parentA = this.selectParent();

      const r = random.double();
      if (r < this.crossoverRate) {
        const parentB = this.selectParent();
        const child = parentA.crossover(parentB);
        newPopulation.push(child);
      } else if (r < this.crossoverRate + this.mutationRate) {
        newPopulation.push(parentA.mutate());
      } else {
        newPopulation.push(parentA);
      }
    }

    this.population = newPopulation;
  }
}
