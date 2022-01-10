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
let NUM_INSTANCES = "-1";

let POPULATION_SIZE = 50;
let CROSSOVER_RATE = 0.9;
let MUTATION_RATE = 0.1;
let ELITISM_COUNT = 2;

/** @type {Map<string, [string, number]>} */
let allTimeIndividualsMap = new Map();

/**
 *
 * @param {string} path
 * @param {import('./types.js').TruthTable} truthTable
 * @param {number} [currentGeneration]
 * @param {number[][]} population
 */
export async function main(
  path,
  truthTable,
  currentGeneration = 0,
  population
) {
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
    POPULATION_SIZE,
    MUTATION_RATE,
    CROSSOVER_RATE,
    ELITISM_COUNT
  );
  if (population) {
    ga.generationCount = currentGeneration - 1;
    ga.population = population;
    ga.nextGeneration();
  } else {
    ga.generatePopulation(file.layout.area.width, file.layout.area.height, {
      num_instances: NUM_INSTANCES,
    });
  }

  const max = NUM_GENERATIONS + currentGeneration;
  for (let i = currentGeneration; i < max; i++) {
    console.log("\nGeneration", i + 1, "of", max);
    const qtd = ga.population.map((p) => p.dbCount);
    qtd.sort((a, b) => a - b);
    console.log("num DBs: min:", qtd.shift(), "| max:", qtd.pop());
    const ind = await ga.getBestIndividual(file, truthTable);
    console.log(
      `Best individual: ${ind.id} (${ind.fitness}/${ind.results.maxScore})`
    );
    console.log(ind.toString(true));
    try {
      saveLog(RUN_ID, ga, ind, truthTable, allTimeIndividualsMap);
    } catch (error) {
      console.error("Error writing run log:", error);
    }
    if (i < max - 1) ga.nextGeneration();
  }
}

/**
 *
 * @param {string} runId
 * @param {GeneticAlgorithm} ga
 * @param {Individual} bestIndividual
 * @param {import('./types.js').TruthTable} truthTable
 * @param {Map<string, [string, number]>} allTimeIndividuals
 */
function saveLog(runId, ga, bestIndividual, truthTable, allTimeIndividuals) {
  // fill allTimeIndividuals map
  for (let ind of ga.population) {
    allTimeIndividuals.set(ind.id, [ind.geneticCode.join(""), ind.fitness]);
  }

  const runsFolder = resolve("./runs");
  fs.mkdirSync(runsFolder, { recursive: true });
  fs.writeFileSync(
    `${runsFolder}/.${runId}.json.swp`,
    JSON.stringify(
      {
        version: 2,
        runId,
        populationSize: POPULATION_SIZE,
        crossoverRate: CROSSOVER_RATE,
        mutationRate: MUTATION_RATE,
        elitismCount: ELITISM_COUNT,
        generationNumber: ga.generationCount + 1,
        truthTable: truthTable(),
        bestIndividual: {
          ...bestIndividual,
          geneticCode: bestIndividual.geneticCode.join(""),
        },
        currentPopulation: ga.population.map((ind) => ind.id),
        randomSeed: RANDOM_SEED,
        randomState: random.count,
        individuals: Array.from(allTimeIndividuals.entries()),
      },
      null,
      2
    )
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

  if (prev.version !== 2) {
    throw new Error(`Log version (${prev.version}) unsupported.`);
  }

  prev.allTimeIndividuals = new Map(prev.individuals);

  setRandomSeed(prev.randomSeed);
  for (let i = 0; i < prev.randomState; i++) random.double();
  POPULATION_SIZE = prev.populationSize;
  CROSSOVER_RATE = prev.crossoverRate;
  MUTATION_RATE = prev.mutationRate;
  ELITISM_COUNT = prev.elitismCount;

  prev.currentPopulation = prev.currentPopulation.map((ind) => {
    let [geneticCode, fitness] = prev.allTimeIndividuals.get(ind);
    let newInd = new Individual(
      prev.bestIndividual.width,
      prev.bestIndividual.height,
      prev.bestIndividual.simParams,
      geneticCode.split("").map((v) => +v)
    );
    newInd.fitness = fitness;
    return newInd;
  });
  prev.tt = prev.truthTable;
  prev.truthTable = () => prev.tt;
  console.log("Current best individual:");
  console.log(
    new Individual(
      prev.bestIndividual.width,
      prev.bestIndividual.height,
      prev.bestIndividual.simParams,
      prev.bestIndividual.geneticCode.split("").map((v) => +v)
    ).toString()
  );
  console.log("---\n");
  return prev;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.error("Usage: node go.js file.sqd [continue.json]");
    process.exit(1);
  }
  if (process.argv.length < 4) {
    await main(process.argv[2], cruzador);
  } else {
    const prev = loadLog(process.argv[3]);
    allTimeIndividualsMap = prev.allTimeIndividuals;
    await main(
      process.argv[2],
      prev.truthTable,
      prev.generationNumber,
      prev.currentPopulation
    );
  }
}
