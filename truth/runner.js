/**
 *
 * @param {import('../sqd/file').SiQADFile} siqadFile
 * @param {import('../types').TruthTable} truthTable
 * @param {object} config
 * @param {import('../types').SimulationParameters} config.simParams
 * @param {boolean} config.generateSiQADResult
 * @param {boolean} config.retainSimulationFiles
 * @param {boolean} config.failFast
 * @returns
 */
export async function run(
  siqadFile,
  truthTable,
  {
    simParams,
    generateSiQADResult = false,
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
  let score = 0;
  let maxScore = table.length * table[0].output.length;

  for (const entry of table) {
    const { simulationResult } = await siqadFile.runSimulation(
      entry.input,
      simParams,
      { generateSiQADResult, retainSimulationFiles }
    );

    if (!simulationResult) {
      result = false;
      if (failFast) break;
      else continue;
    }

    entry.result = simulationResult.output.map((e) => +e);

    for (let i = 0; i < simulationResult.output.length; i++) {
      if (entry.result[i] !== entry.output[i]) result = false;
      else score++;
    }

    if (!result && failFast) break;
  }

  return {
    result,
    score,
    maxScore,
    truthTable: table,
  };
}
