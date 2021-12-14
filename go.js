import { run } from "./truth/runner.js";
import cruzador from "./truth/tables/cruzador.js";
import { SiQADFile } from "./sqd/file.js";
import { createInnerDBs } from "./sqd/layout.js";
import { cruzador as targetCruzador } from "./target.js";
import { Individual } from "./ga/individual.js";
import { GeneticAlgorithm } from "./ga/algorithm.js";

export async function main(path) {
  const file = new SiQADFile();
  file.open(path);

  const ga = new GeneticAlgorithm(10, 0.1, 0.9, 2);
  ga.generatePopulation(file.layout.area.width, file.layout.area.height);

  const max = 2;
  for (let i = 0; i < max; i++) {
    console.log("Geração", i + 1);
    const qtd = ga.population.map((p) => p.dbCount);
    qtd.sort((a, b) => a - b);
    console.log("min:", qtd.shift(), "| max:", qtd.pop());
    const ind = await ga.getBestIndividual(file, cruzador);
    console.log(
      ind.id,
      ind.fitness,
      JSON.stringify(ind.results, null, 2),
      ind.getPhenotype(file.layout)
    );

    file.layout.setInner(createInnerDBs(ind.getPhenotype(file.layout)));
    console.log(file.layout.id);
    const results = await run(file, cruzador, {
      failFast: false,
      simParams: { mu: "-0.32", num_instances: "-1" },
      generateSiQADResult: true,
      retainSimulationFiles: false,
    });
    console.log(JSON.stringify(results, null, 2));
    if (i < max - 1) ga.nextGeneration();
  }

  // file.layout.setInner(createInnerDBs(targetCruzador));
  // let results = await run(file, cruzador, {
  //   failFast: fast,
  //   simParams: { mu: "-0.32", num_instances: "40" },
  //   generateSiQADResult: true,
  //   retainSimulationFiles: false,
  // });
  // console.log(JSON.stringify(results, null, 2));
}
