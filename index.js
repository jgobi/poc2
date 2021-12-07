const RANDOM_SEED = 'nanocomp';
const alea = require('./alea');
const random = new alea(RANDOM_SEED); // prng

class Individual {
  constructor(width, height, geneticCode) {
    this.dirty = true;
    this.fitness = 0;
    this.width = width;
    this.height = height;
    this.geneticCode =
      geneticCode ??
      Array(width * height)
        .fill(0)
        .map(() => (random.double() < 0.5 ? 0 : 1));
  }

  getFitness() {
    if (!this.dirty) return this.fitness;

    this.fitness = 0;
    for (let i = 0; i < this.geneticCode.length; i++) {
      if (this.geneticCode[i] === 1) {
        this.fitness++;
      }
    }
    this.dirty = false;
    return this.fitness;
  }
}

class GeneticAlgorithm {
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
