import { run } from "./truth/runner.js";
import cruzador from "./truth/tables/cruzador.js";
import { SiQADFile } from "./sqd/file.js";
import { createInnerDBs } from "./sqd/layout.js";
import { cruzador as targetCruzador } from "./target.js";

export async function main(path, fast = true) {
  const file = new SiQADFile();
  file.open(path);

  file.layout.setInner(createInnerDBs(targetCruzador));
  let results = await run(file, cruzador, {
    failFast: fast,
    simParams: { mu: "-0.32", num_instances: "40" },
    shouldGenerateSiQADResult: true,
    retainSimulationFiles: false,
  });
  console.log(JSON.stringify(results, null, 2));
}
