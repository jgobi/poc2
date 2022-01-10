#!/bin/env node
import { mkdirSync, readFileSync } from "fs";
import { basename } from "path";
import { Individual } from "../ga/individual.js";
import { SiQADFile } from "../sqd/file.js";
import { createInnerDBs } from "../sqd/layout.js";
import { run } from "../truth/runner.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

async function main() {
  const skipCheck = process.argv[2] === "--skip-check";
  const trueArgv = process.argv.slice(skipCheck ? 3 : 2);
  if (trueArgv.length < 2) {
    console.error(
      "Usage: node log2siqad.js [--skip-check] siqad-file.sqd log-file.json [destination-folder]"
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

  mkdirSync(destinationFolder, { recursive: true });

  const { individuals, bestIndividual, truthTable } = JSON.parse(
    readFileSync(logFilePath, "utf-8")
  );
  individuals.sort((a, b) => b[1][1] - a[1][1]);
  const maxFitness = individuals[0][1][1];
  console.log(`Log file maximum fitness: ${maxFitness}\n`);

  const siqadFile = new SiQADFile();
  siqadFile.open(siqadFilePath);

  let c = 0;
  for (const [id, [geneticCode, fitness]] of individuals) {
    if (fitness < maxFitness) break;
    const ind = new Individual(
      bestIndividual.width,
      bestIndividual.height,
      {},
      geneticCode.split("").map((v) => +v)
    );
    siqadFile.layout.setInner(
      createInnerDBs(ind.getPhenotype(siqadFile.layout))
    );

    let result = skipCheck;

    console.log(`Individual "${id}":\n${ind.toString(true)}`);
    if (skipCheck) {
      console.log(`Simulation skipped.\n`);
    } else {
      process.stdout.write("Running simulation... ");
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
      console.log(result ? "OK!\n" : "inaccurate results, rejected.\n");
    }

    if (result) {
      c++;
      siqadFile.save(
        Array(truthTable[0].input.length).fill(1),
        `${destinationFolder}/${id}.sqd`
      );
    }
  }

  if (!skipCheck) console.log(`Generated ${c} accurate individuals.`);
  else console.log(`Generated ${c} individuals with fitness ${maxFitness}.`);
  console.log("Done");
}
