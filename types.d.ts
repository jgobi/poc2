export interface DB {
  index: number;
  n: number;
  m: number;
  l: number;
  color: string;
}

export interface ParsedDBs {
  inputs: DB[];
  flatOutputs: DB[];
  outputs: [DB, DB][];
  area: [DB, DB, DB, DB];
  fixed: DB[];
}

export interface TruthTableEntry {
  input: (boolean | number)[];
  output: (boolean | number)[];
}

export type TruthTable = () => TruthTableEntry[];
