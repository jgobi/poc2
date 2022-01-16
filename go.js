#!/bin/env node
import fs from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

import cruzador from "./truth/tables/cruzador.js";
import { SiQADFile } from "./sqd/file.js";
import { GeneticAlgorithm } from "./ga/algorithm.js";
import { random, RANDOM_SEED, setRandomSeed } from "./random.js";
import { Individual } from "./ga/individual.js";

const NUM_GENERATIONS = 30;

/** @type {import('./types.js').GeneticAlgorithmState} */
const GA_STATE = {
  options: {
    crossoverRate: 0.9,
    elitismCount: 2,
    mutationRate: 0.1,
    populationSize: 50,
    truthTable: cruzador,
    simulationParameters: {
      num_instances: "-1",
    },
  },
  get randomSeed() {
    return RANDOM_SEED;
  },
  get randomState() {
    return random.count;
  },
  statistics: {
    generations: [],
    individuals: new Map(),
  },
};

const INDIVIDUAL_PROPERTIES = {
  width: 0,
  height: 0,
};

/**
 *
 * @param {string} path
 */
export async function main(path) {
  const RUN_ID = randomUUID();
  console.log("Random seed:", RANDOM_SEED);
  console.log("Run id:", RUN_ID);
  console.log("Population size:", POPULATION_SIZE);
  console.log("Crossover rate:", CROSSOVER_RATE);
  console.log("Mutation rate:", MUTATION_RATE);
  console.log("Elitism count:", ELITISM_COUNT);
  console.log("---");

  const file = new SiQADFile();
  file.open(path);

  const ga = new GeneticAlgorithm(
    GA_STATE.options.populationSize,
    GA_STATE.options.mutationRate,
    GA_STATE.options.crossoverRate,
    GA_STATE.options.elitismCount
  );
  if (GA_STATE.statistics.generations > 0) {
    // if resuming evolution
    ga.generationCount = GA_STATE.statistics.generations.length - 1;
    ga.population = GA_STATE.statistics.generations[
      ga.generationCount
    ].population.map((id) => {
      let ind = GA_STATE.statistics.individuals.get(id);
      let newInd = new Individual(
        file.layout.area.width,
        file.layout.area.height,
        GA_STATE.options.simulationParameters,
        ind.gc.split("").map((v) => +v)
      );
      newInd.fitness = ind.f;
      return newInd;
    });
    ga.nextGeneration();
  } else {
    // starting evolution from scratch
    ga.generatePopulation(
      file.layout.area.width,
      file.layout.area.height,
      GA_STATE.options.simulationParameters
    );
  }

  INDIVIDUAL_PROPERTIES.width = ga.population[0].width;
  INDIVIDUAL_PROPERTIES.height = ga.population[0].height;

  const max = NUM_GENERATIONS + ga.generationCount;
  for (let i = currentGeneration; i < max; i++) {
    console.log("\nGeneration", i + 1, "of", max);
    const qtd = ga.population.map((p) => p.dbCount);
    qtd.sort((a, b) => a - b);
    console.log("Min DB count:", qtd.shift(), "| Max DB count:", qtd.pop());
    const ind = await ga.getBestIndividual(file, GA_STATE.options.truthTable);
    console.log(
      `Best individual: ${ind.id} (${ind.fitness}/${ind.results.maxScore})`
    );
    console.log(ind.toString(true));
    try {
      collectStatisticsCurrentGeneration(ga, ind);
      saveLog(RUN_ID);
    } catch (error) {
      console.error("Error writing run log:", error);
    }
    if (i < max - 1) ga.nextGeneration();
  }
}

/**
 *
 * @param {GeneticAlgorithm} ga
 * @param {Individual} bestIndividual
 */
function collectStatisticsCurrentGeneration(ga, bestIndividual) {
  for (let ind of ga.population) {
    GA_STATE.statistics.individuals.set(ind.id, {
      gc: ind.geneticCode.join(""),
      f: ind.fitness,
      db: ind.dbCount,
    });
  }

  GA_STATE.statistics.generations.push({
    bestIndividual: bestIndividual.id,
    population: ga.population.map((ind) => ind.id),
  });
}

/**
 *
 * @param {string} runId
 */
function saveLog(runId) {
  const runsFolder = resolve("./runs");
  fs.mkdirSync(runsFolder, { recursive: true });
  fs.writeFileSync(
    `${runsFolder}/.${runId}.json.swp`,
    JSON.stringify({
      version: 3,
      runId,
      options: {
        ...GA_STATE.options,
        truthTable: GA_STATE.options.truthTable(),
      },
      individualProperties: INDIVIDUAL_PROPERTIES, // FIXME: remove this field
      randomSeed: GA_STATE.randomSeed,
      randomState: GA_STATE.randomState,
      generations: GA_STATE.statistics.generations,
      individuals: Array.from(GA_STATE.statistics.individuals.entries()),
    })
  );
  fs.renameSync(
    `${runsFolder}/.${runId}.json.swp`,
    `${runsFolder}/${runId}.json`
  );
  console.log("\nRun log saved at:", `${runsFolder}/${runId}.json`);
}

/**
 * @param {string} filePath
 * @returns {{allTimeIndividuals: Map<string, [string, number]>, currentPopulation: Individual[], truthTable: import('./types.js').TruthTable, generationNumber: number }}
 */
function loadLog(filePath) {
  console.log("Resuming from previous run...\n");
  let prev = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (prev.version !== 3) {
    throw new Error(`Log version (${prev.version}) unsupported.`);
  }

  setRandomSeed(prev.randomSeed, prev.randomState);

  GA_STATE.options = {
    ...prev.options,
    truthTable: () => prev.options.truthTable,
  };
  GA_STATE.statistics.generations = prev.generations;
  GA_STATE.statistics.individuals = new Map(prev.individuals);

  INDIVIDUAL_PROPERTIES.width = prev.individualProperties.width;
  INDIVIDUAL_PROPERTIES.height = prev.individualProperties.height;

  console.log("Current best individual:");
  const best = GA_STATE.statistics.individuals.get(
    GA_STATE.statistics.generations[GA_STATE.statistics.generations.length - 1]
      .bestIndividual
  );
  console.log(
    new Individual(
      INDIVIDUAL_PROPERTIES.width,
      INDIVIDUAL_PROPERTIES.height,
      GA_STATE.options.simulationParameters,
      best.gc.split("").map((v) => +v)
    ).toString()
  );
  console.log(`DB Count: ${best.db}; Fitness: ${best.f}`);
  console.log("---\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.error("Usage: node go.js file.sqd [continue.json]");
    process.exit(1);
  }
  if (process.argv.length >= 4) {
    loadLog(process.argv[3]);
  }
  await main(process.argv[2]);
}
