import cruzador from "./truth/tables/cruzador.js";
import { SiQADFile } from "./sqd/file.js";
import { GeneticAlgorithm } from "./ga/algorithm.js";

export async function main(path) {
  const file = new SiQADFile();
  file.open(path);

  const ga = new GeneticAlgorithm(10, 0.1, 0.9, 2);
  ga.generatePopulation(file.layout.area.width, file.layout.area.height, {
    num_instances: "40",
  });

  const max = 2;
  for (let i = 0; i < max; i++) {
    console.log("Geração", i + 1, "de", max);
    const qtd = ga.population.map((p) => p.dbCount);
    qtd.sort((a, b) => a - b);
    console.log("num DBs: min:", qtd.shift(), "| max:", qtd.pop());
    const ind = await ga.getBestIndividual(file, cruzador);
    console.log(
      `Melhor indivíduo: ${ind.id} (${ind.fitness}/${ind.results.maxScore})`
    );
    console.log(ind.toString(true));
    if (i < max - 1) ga.nextGeneration();
  }
}
