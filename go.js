#!/bin/env node
import fs from "fs";
import arg from "arg";
import { resolve } from "path";
import { randomUUID } from "crypto";

import { SiQADFile } from "./sqd/file.js";
import { GeneticAlgorithm } from "./ga/algorithm.js";
import { random, RANDOM_SEED, setRandomSeed } from "./random.js";
import { Individual } from "./ga/individual.js";

let NUM_GENERATIONS = 30;

/** @type {import('./types.js').GeneticAlgorithmState} */
const GA_STATE = {
  options: {
    crossoverRate: 0.9,
    elitismCount: 2,
    mutationRate: 0.1,
    populationSize: 50,
    truthTable: null,
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

/**
 *
 * @param {SiQADFile} file
 * @param {string} [prefix]
 */
export async function main(file, prefix = "") {
  const RUN_ID = (prefix ? prefix + "_" : "") + randomUUID();
  console.log("Process PID:", process.pid);
  console.log("Random seed:", GA_STATE.randomSeed);
  console.log("Run id:", RUN_ID);
  console.log("Population size:", GA_STATE.options.populationSize);
  console.log("Crossover rate:", GA_STATE.options.crossoverRate);
  console.log("Mutation rate:", GA_STATE.options.mutationRate);
  console.log("Elitism count:", GA_STATE.options.elitismCount);
  console.log("---");

  const ga = new GeneticAlgorithm(
    GA_STATE.options.populationSize,
    GA_STATE.options.mutationRate,
    GA_STATE.options.crossoverRate,
    GA_STATE.options.elitismCount
  );
  if (GA_STATE.statistics.generations.length > 0) {
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

  const max = NUM_GENERATIONS + ga.generationCount;
  for (let i = ga.generationCount; i < max; i++) {
    console.log("\nCurrent date is:", new Date().toISOString());
    let start = Date.now();
    console.log("Generation", i + 1, "of", max);
    const qtd = ga.population.map((p) => p.dbCount);
    qtd.sort((a, b) => a - b);
    console.log("Min DB count:", qtd.shift(), "| Max DB count:", qtd.pop());
    const ind = await ga.getBestIndividual(file, GA_STATE.options.truthTable);
    console.log(
      `Best individual: ${ind.id} (${ind.fitness}/${ind.results.maxScore})`
    );
    console.log(ind.toString(true));
    console.log("(took %d seconds)", Math.floor((Date.now() - start) / 1000));
    try {
      collectStatisticsCurrentGeneration(ga, ind);
      saveLog(RUN_ID, {
        path: file.path,
        content: file.xmlContent,
      });
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
 * @param {{path: string, content: string}} siqadFile
 */
function saveLog(runId, siqadFile) {
  const runsFolder = resolve("./runs");
  fs.mkdirSync(runsFolder, { recursive: true });
  fs.writeFileSync(
    `${runsFolder}/.${runId}.json.swp`,
    JSON.stringify(
      {
        version: 3,
        runId,
        options: {
          ...GA_STATE.options,
          truthTable: GA_STATE.options.truthTable(),
        },
        randomSeed: GA_STATE.randomSeed,
        randomState: GA_STATE.randomState,
        generations: GA_STATE.statistics.generations,
        individuals: Array.from(GA_STATE.statistics.individuals.entries()),
        siqadFile,
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
 * @returns {{ siqadFile: SiQADFile }}
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

  const siqadFile = new SiQADFile();
  siqadFile.load(prev.siqadFile.path, prev.siqadFile.content);

  console.log("Current best individual:");
  const best = GA_STATE.statistics.individuals.get(
    GA_STATE.statistics.generations[GA_STATE.statistics.generations.length - 1]
      .bestIndividual
  );
  console.log(
    new Individual(
      siqadFile.layout.area.width,
      siqadFile.layout.area.height,
      GA_STATE.options.simulationParameters,
      best.gc.split("").map((v) => +v)
    ).toString()
  );
  console.log(`DB Count: ${best.db}; Fitness: ${best.f}`);
  console.log("---\n");

  return { siqadFile };
}

// ---- Execução

if (import.meta.url === `file://${process.argv[1]}`) {
  function help(exit = true) {
    console.error(
      "Usage: node go.js [-h] [--prefix log-file-name-prefix] [-n num-generations] [-c run-log.json] [-t truth-table.js [-o options.json] siqad-file.sqd]"
    );
    if (exit) process.exit(1);
  }
  function optionsHelp(exit = true) {
    console.error(
      `The options file, if supplied, must be a JSON containing an object with one or more of the properties in the example bellow (which shows the default values for them):
{
  "crossoverRate": 0.9,
  "elitismCount": 2,
  "mutationRate": 0.1,
  "populationSize": 50,
  "simulationParameters": {
    "T_e_inv_point": "0.09995",
    "T_init": "500",
    "T_min": "2",
    "T_schedule": "exponential",
    "anneal_cycles": "10000",
    "debye_length": "5",
    "eps_r": "5.6",
    "hop_attempt_factor": "5",
    "num_instances": "-1",
    "phys_validity_check_cycles": "10",
    "reset_T_during_v_freeze_reset": "false",
    "result_queue_size": "0.1",
    "strategic_v_freeze_reset": "false",
    "v_freeze_end_point": "0.4",
    "v_freeze_init": "-1",
    "v_freeze_reset": "-1",
    "v_freeze_threshold": "4",
    "muzn": "-0.32"
  }
}`
    );
    if (exit) process.exit(1);
  }

  let args;
  try {
    args = arg({
      "-h": Boolean,
      "-n": Number,
      "-c": String,
      "-t": String,
      "-o": String,
      "--prefix": String,

      // Aliases
      "--help": "-h",
    });
  } catch (err) {
    if (err instanceof arg.ArgError) {
      console.log(err.message);
      help();
    } else throw err;
  }

  if (args["-h"]) {
    help(false);
    console.log();
    optionsHelp();
  }

  if (args["-n"]) NUM_GENERATIONS = parseInt(args["-n"]);

  if (args["-c"] && (args["-t"] || args["-o"] || args._.length)) {
    console.error("You can either start or resume an evolution, not both!");
    help();
  }

  if (args["-c"]) {
    const { siqadFile } = loadLog(args["-c"]);
    await main(siqadFile, args["--prefix"] || "");
  } else if (args["-t"] && args._.length === 1) {
    GA_STATE.options.truthTable = (await import("./" + args["-t"])).default;
    if (args["-o"]) {
      try {
        const options = JSON.parse(fs.readFileSync(args["-o"], "utf-8"));
        let opts = [
          "crossoverRate",
          "elitismCount",
          "mutationRate",
          "populationSize",
        ];
        let simParams = [
          "T_e_inv_point",
          "T_init",
          "T_min",
          "T_schedule",
          "anneal_cycles",
          "debye_length",
          "eps_r",
          "hop_attempt_factor",
          "num_instances",
          "phys_validity_check_cycles",
          "reset_T_during_v_freeze_reset",
          "result_queue_size",
          "strategic_v_freeze_reset",
          "v_freeze_end_point",
          "v_freeze_init",
          "v_freeze_reset",
          "v_freeze_threshold",
          "muzn",
        ];
        for (const opt of opts) {
          let n = parseFloat(options[opt], 10);
          if (!Number.isNaN(n)) GA_STATE.options[opt] = n;
        }
        if (options.simulationParameters) {
          for (const opt of simParams) {
            if (options.simulationParameters[opt] != null) {
              GA_STATE.options.simulationParameters[opt] =
                options.simulationParameters[opt].toString();
            }
          }
        }
      } catch (err) {
        console.error("Invalid options file.", err);
        optionsHelp();
      }
    }
    const siqadFile = new SiQADFile();
    siqadFile.open(args._[0]);
    await main(siqadFile, args["--prefix"] || "");
  } else {
    help();
  }
}
