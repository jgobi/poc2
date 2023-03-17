/**
 *
 * @param {import('../sqd/file').SiQADFile} siqadFile
 * @param {import('../types').TruthTable} truthTable
 * @param {object} config
 * @param {import('../types').SimulationParameters} config.simParams
 * @param {number} [config.nLogicalOccurrence]
 * @param {boolean} [config.failFast]
 * @returns
 */
export async function run(
  siqadFile,
  truthTable,
  {
    simParams,
    nLogicalOccurrence = 10,
    resultLimiar = 0.9,
    failFast = false,
  } = {}
) {
  const table = truthTable().map((entry) => ({
    input: entry.input,
    output: entry.output.map((e) => +e),
    outputScore: Array(entry.output.length).fill(0),
  }));

  let result = true;

  for (const entry of table) {
    for (let i = 0; i < nLogicalOccurrence; i++) {
      const { simulationResult } = await siqadFile.runSimulation(
        entry.input,
        simParams,
        { generateSiQADResult: false, retainSimulationFiles: false }
      );

      if (!simulationResult) continue;

      for (let i = 0; i < simulationResult.output.length; i++) {
        entry.outputScore[i] += +(
          +simulationResult.output[i] === +entry.output[i]
        );
      }
    }
    entry.outputScore = entry.outputScore.map((s) => s / nLogicalOccurrence);
    if (entry.outputScore.some((s) => s < resultLimiar)) result = false;
    if (!result && failFast) break;
  }

  // Fitness Calc
  const score = harmonicMean(
    table.map(
      ({ outputScore: os }) => os.reduce((acc, n) => acc + n) / os.length
    ),
    nLogicalOccurrence / 1e3
  );

  return {
    result,
    score,
    maxScore: 1,
    truthTable: table,
  };
}

/**
 *
 * @param {number[]} arr
 * @param {number} zeroReplacer
 */
function harmonicMean(arr, zeroReplacer = 0) {
  return arr.length / arr.reduce((acc, n) => acc + 1 / (n || zeroReplacer), 0);
}
