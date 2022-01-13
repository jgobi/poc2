#!/bin/env node
import { Console } from "console";
import { createWriteStream, mkdirSync, readFileSync } from "fs";
import { basename } from "path";
import { Individual } from "../ga/individual.js";
import { SiQADFile } from "../sqd/file.js";
import { createInnerDBs } from "../sqd/layout.js";
import { run } from "../truth/runner.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

function createLogger(path) {
  const file = createWriteStream(path, { encoding: "utf-8", flags: "w" });
  const myConsole = new Console(file);
  return {
    log(...args) {
      console.log(...args);
      myConsole.log(...args);
    },
    write(str) {
      process.stdout.write(str);
      file.write(str);
    },
  };
}

function parseArgs(args) {
  let trueArgv = args.slice(2);
  const skipCheck = trueArgv.findIndex((v) => v === "--skip-check") + 1;
  const nSimUsed = trueArgv.findIndex((v) => v === "-n") + 1;

  let nSimulations = 1;

  if (skipCheck && nSimUsed) {
    console.error("Can't use -n and --skip-check at the same time.");
    process.exit(1);
  }
  if (skipCheck) {
    trueArgv.splice(skipCheck - 1, 1);
    nSimulations = 0;
  }
  if (nSimUsed) {
    let [_, n] = trueArgv.splice(nSimUsed - 1, 2);
    nSimulations = n;
  }
  if (trueArgv.length < 2 || trueArgv.some((v) => v.startsWith("-"))) {
    console.error(
      "Usage: node log2siqad.js [-n num-simulations] [--skip-check] siqad-file.sqd log-file.json [destination-folder]"
    );
    process.exit(1);
  }

  const siqadFilePath = trueArgv[0];
  const logFilePath = trueArgv[1];
  const destinationFolder =
    trueArgv[2] ||
    `results/${basename(trueArgv[0], ".sqd")}/${basename(
      trueArgv[1],
      ".json"
    )}`;

  return {
    nSimulations,
    siqadFilePath,
    logFilePath,
    destinationFolder,
  };
}

async function main() {
  const { logFilePath, nSimulations, siqadFilePath, destinationFolder } =
    parseArgs(process.argv);

  mkdirSync(destinationFolder, { recursive: true });
  const logger = createLogger(destinationFolder + "/output.log");

  const { individuals, bestIndividual, truthTable } = JSON.parse(
    readFileSync(logFilePath, "utf-8")
  );
  individuals.sort((a, b) => b[1][1] - a[1][1]);
  const maxFitness = individuals[0][1][1];
  logger.log(`Log file maximum fitness: ${maxFitness}.`);
  logger.log(
    `Simulation will be ran ${nSimulations} times for each individual`
  );

  let uniqueIndividuals = new Map();
  individuals.forEach(([id, [geneticCode, fitness]]) => {
    if (fitness >= maxFitness) {
      uniqueIndividuals.set(geneticCode, {
        id,
        n: (uniqueIndividuals.get(geneticCode)?.n || 0) + 1,
      });
    }
  });
  logger.log(`Analyzing ${uniqueIndividuals.size} unique individuals.\n`);

  const siqadFile = new SiQADFile();
  siqadFile.open(siqadFilePath);

  let c = 0;
  let i = 1;
  for (const [geneticCode, { id, n }] of uniqueIndividuals.entries()) {
    const ind = new Individual(
      bestIndividual.width,
      bestIndividual.height,
      {},
      geneticCode.split("").map((v) => +v)
    );
    siqadFile.layout.setInner(
      createInnerDBs(ind.getPhenotype(siqadFile.layout))
    );

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
      for (let i = 0; i < nSimulations && result; i++) {
        const results = await run(siqadFile, () => truthTable, {
          failFast: true,
          generateSiQADResult: false,
          retainSimulationFiles: false,
          simParams: {
            ...(bestIndividual.simParams || {}),
            num_instances: "-1",
          },
        });
        result = results.result;
        logger.write(".");
      }
      logger.log(result ? "OK!\n" : "inaccurate results, rejected.\n");
    }

    if (result) {
      c++;
      siqadFile.save(
        Array(truthTable[0].input.length).fill(1),
        `${destinationFolder}/${id}.sqd`
      );
    }
  }

  if (nSimulations > 0) logger.log(`Generated ${c} accurate individuals.`);
  else logger.log(`Generated ${c} individuals with fitness ${maxFitness}.`);
  logger.log("Done");
}
