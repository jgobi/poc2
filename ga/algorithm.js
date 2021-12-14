import alea from "../alea.cjs";
import { Individual } from "./individual.js";

const RANDOM_SEED = "nanocomp";
const random = new alea(RANDOM_SEED); // prng

export class GeneticAlgorithm {
  constructor(populationSize, mutationRate, crossoverRate, elitismCount) {
    this.population = [];
    this.populationSize = populationSize;

    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
    this.elitismCount = elitismCount;
    this.dirty = true;

    this.generationCount = 0;
  }

  generatePopulation(width, height) {
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push(new Individual(width, height));
    }
  }

  calculatePopulationFitness() {
    if (!this.dirty) return;
    this.population.sort((a, b) => b.getFitness() - a.getFitness());
    this.dirty = false;
  }

  getBestIndividual() {
    this.calculatePopulationFitness();
    return this.population[0];
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

    this.population = newPopulation.push(...elitismPopulation);
  }
}
