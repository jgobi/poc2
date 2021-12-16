import fs from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

import cruzador from "./truth/tables/cruzador.js";
import { SiQADFile } from "./sqd/file.js";
import { GeneticAlgorithm } from "./ga/algorithm.js";
import { random, RANDOM_SEED, setRandomSeed } from "./random.js";
import { Individual } from "./ga/individual.js";

const NUM_GENERATIONS = 5;

let POPULATION_SIZE = 20;
let CROSSOVER_RATE = 0.9;
let MUTATION_RATE = 0.1;
let ELITISM_COUNT = 2;

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
  const RUN_ID = randomBytes(8).toString("hex");
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
      num_instances: "-1",
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
    if (i < max - 1) ga.nextGeneration();
  }

  const bestIndividual = await ga.getBestIndividual(file, truthTable);
  saveLog(RUN_ID, ga, bestIndividual, truthTable);
}

/**
 *
 * @param {string} runId
 * @param {GeneticAlgorithm} ga
 * @param {Individual} bestIndividual
 * @param {import('./types.js').TruthTable} truthTable
 */
function saveLog(runId, ga, bestIndividual, truthTable) {
  const runsFolder = resolve("./runs");
  fs.mkdirSync(runsFolder, { recursive: true });
  fs.writeFileSync(
    `${runsFolder}/${runId}.json`,
    JSON.stringify(
      {
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
        population: ga.population.map((ind) => [
          ind.geneticCode.join(""),
          ind.fitness,
        ]),
        randomSeed: RANDOM_SEED,
        randomState: random.count,
      },
      null,
      2
    )
  );
  console.log("\nRun log saved at:", `${runsFolder}/${runId}.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.error("Usage: node go.js file.sqd [continue.json]");
    process.exit(1);
  }
  if (process.argv.length < 4) {
    await main(process.argv[2], cruzador);
  } else {
    console.log("Resuming from previous run...\n");
    let prev = JSON.parse(fs.readFileSync(process.argv[3], "utf-8"));
    setRandomSeed(prev.randomSeed);
    for (let i = 0; i < prev.randomState; i++) random.double();
    POPULATION_SIZE = prev.populationSize;
    CROSSOVER_RATE = prev.crossoverRate;
    MUTATION_RATE = prev.mutationRate;
    ELITISM_COUNT = prev.elitismCount;
    const population = prev.population.map((ind) => {
      let newInd = new Individual(
        prev.bestIndividual.width,
        prev.bestIndividual.height,
        prev.bestIndividual.simParams,
        ind[0].split("").map((v) => +v)
      );
      newInd.fitness = ind[1];
      return newInd;
    });
    const tt = () => prev.truthTable;
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
    await main(process.argv[2], tt, prev.generationNumber, population);
  }
}
