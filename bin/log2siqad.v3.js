#!/bin/env node
import arg from "arg";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { Individual } from "../ga/individual.js";
import { createLogger } from "../helpers.js";
import { SiQADFile } from "../sqd/file.js";
import { createInnerDBs } from "../sqd/layout.js";
import { run } from "../truth/runner.v2.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

function parseArgs() {
  function help() {
    console.error(
      "Usage: node log2siqad.v3.js [-h] [-n num-simulations | --skip-check] [-o destination_folder] log-file.json"
    );
    process.exit(1);
  }

  let args;
  try {
    args = arg({
      "-h": Boolean,
      "-n": Number,
      "-o": String,
      "--skip-check": Boolean,

      // Aliases
      "--help": "-h",
    });
  } catch (err) {
    if (err instanceof arg.ArgError) {
      console.log(err.message);
      help();
    } else throw err;
  }

  if (args["-h"]) help();

  if (args["-n"] && args["--skip-check"]) {
    console.error("Can't use -n and --skip-check at the same time.");
    help();
  }

  if (args._.length !== 1) help();

  let nSimulations = 1;
  if (args["--skip-check"]) nSimulations = 0;
  if (args["-n"] || args["-n"] === 0) nSimulations = args["-n"];

  const logFilePath = args._[0];

  const log = JSON.parse(readFileSync(logFilePath, "utf-8"));
  if (log.version !== 3) {
    console.error(
      `This script only supports version 3 log file as input. You provided a log file version ${
        version || 1
      }.`
    );
  }

  const destinationFolder =
    args["-o"] ||
    `results/${basename(log.siqadFile.path, ".sqd")}/${basename(
      logFilePath,
      ".json"
    )}`;

  let trueDestinationFolder = destinationFolder;
  let i = 1;
  while (existsSync(trueDestinationFolder)) {
    trueDestinationFolder = `${destinationFolder} (${i++})`;
  }

  if (destinationFolder !== trueDestinationFolder) {
    console.error(
      `Destination folder already exists, using "${trueDestinationFolder}".`
    );
  }

  return {
    log,
    nSimulations,
    destinationFolder: trueDestinationFolder,
  };
}

async function main() {
  const { log, nSimulations, destinationFolder } = parseArgs();
  const { individuals, options, generations, siqadFile } = log;

  mkdirSync(destinationFolder, { recursive: true });
  const logger = createLogger(destinationFolder + "/output.log");

  individuals.sort((a, b) => b[1].f - a[1].f);
  const maxFitness = individuals[0][1].f;
  logger.log(`Log file maximum fitness: ${maxFitness}.`);
  logger.log(
    `Simulation will be ran ${nSimulations} times for each individual`
  );

  let bestIndividualsGenerations = generations.map((g) => g.bestIndividual);

  let uniqueIndividuals = new Map();
  individuals.forEach(([id, { gc, f }]) => {
    if (f >= maxFitness) {
      let curEntry = uniqueIndividuals.get(gc);
      uniqueIndividuals.set(gc, {
        id: bestIndividualsGenerations.includes(id) ? id : curEntry?.id ?? id,
        n: (curEntry?.n || 0) + 1,
      });
    }
  });
  logger.log(`Analyzing ${uniqueIndividuals.size} unique individuals.\n`);

  const file = new SiQADFile();
  file.load(siqadFile.path, siqadFile.content);

  // SiQAD
  let c = 0;
  let i = 1;
  for (const [geneticCode, { id, n }] of uniqueIndividuals.entries()) {
    const ind = new Individual(
      file.layout.area.width,
      file.layout.area.height,
      {},
      geneticCode.split("").map((v) => +v)
    );
    file.layout.setInner(createInnerDBs(ind.getPhenotype(file.layout)));

    let result = true;

    logger.log(
      `Individual ${i++} of ${
        uniqueIndividuals.size
      } ("${id}") (${n} copies found):\n${ind.toString(true)}`
    );
    if (nSimulations === 0) {
      logger.log(`Simulation skipped.\n`);
    } else {
      logger.write("Running simulation... ");
      const scores = [];
      for (let i = 0; i < nSimulations && result; i++) {
        const results = await run(file, () => options.truthTable, {
          failFast: true,
          simParams: {
            ...(options.simulationParameters || {}),
            num_instances: "-1",
          },
        });
        result = results.result;
        scores.push(results.score);
        logger.write(".");
      }
      const meanAcc = scores.reduce((acc, n) => acc + n, 0) / scores.length;
      logger.log(
        (result ? "OK!" : "inaccurate results, rejected.") +
          " (%d% mean acc)\n",
        Math.round(meanAcc * 100)
      );
    }

    if (result) {
      c++;
      file.save(
        Array(options.truthTable[0].input.length).fill(1),
        `${destinationFolder}/${id}.sqd`
      );
    }
  }

  if (nSimulations > 0) logger.log(`Generated ${c} accurate individuals.`);
  else logger.log(`Generated ${c} individuals with fitness ${maxFitness}.`);

  // Best Individuals
  let outGenerations = [];
  for (const { bestIndividual: bestIndividualId, population } of generations) {
    const [_, bestIndividual] = individuals.find(
      (ind) => ind[0] === bestIndividualId
    );

    const fitnesses = individuals
      .filter((ind) => population.includes(ind[0]))
      .map((ind) => ind[1].f);

    outGenerations.push({
      minFitness: Math.min(...fitnesses),
      avgFitness: fitnesses.reduce((acc, f) => acc + f, 0) / fitnesses.length,
      bestFitness: bestIndividual.f,
      bestIndividual: {
        id: bestIndividualId,
        gc: bestIndividual.gc,
        preview: new Individual(
          file.layout.area.width,
          file.layout.area.height,
          {},
          bestIndividual.gc.split("").map((v) => +v)
        ).toString(),
      },
    });
  }
  writeFileSync(
    destinationFolder + "/statistics.json",
    JSON.stringify(outGenerations, null, 2)
  );

  writeFileSync(destinationFolder + "/base.sqd", file.xmlContent, "utf8");
  logger.log("Done");
}
