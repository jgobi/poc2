/**
 *
 * @param {import('../sqd/file').SiQADFile} siqadFile
 * @param {import('../types').TruthTable} truthTable
 */
export async function run(
  siqadFile,
  truthTable,
  {
    simParams,
    shouldGenerateSiQADResult = false,
    retainSimulationFiles = true,
    failFast = true,
  } = {}
) {
  const table = truthTable();
  table.forEach((entry) => {
    entry.result = null;
    entry.output = entry.output.map((e) => +e);
  });

  let result = true;

  for (const entry of table) {
    const { simulationResult } = await siqadFile.runSimulation(
      entry.input,
      simParams,
      { shouldGenerateSiQADResult, retainSimulationFiles }
    );
    entry.result = simulationResult.output.map((e) => +e);

    for (let i = 0; i < simulationResult.output.length; i++) {
      if (entry.result[i] !== entry.output[i]) result = false;
    }

    if (!result && failFast) break;
  }

  return {
    result,
    truthTable: table,
  };
}
