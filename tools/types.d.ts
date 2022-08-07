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

export interface SimulationParameters {
  T_e_inv_point: string;
  T_init: string;
  T_min: string;
  T_schedule: string;
  anneal_cycles: string;
  debye_length: string;
  eps_r: string;
  hop_attempt_factor: string;
  muzm: string;
  mu: string;
  num_instances: string;
  phys_validity_check_cycles: string;
  reset_T_during_v_freeze_reset: string;
  result_queue_size: string;
  strategic_v_freeze_reset: string;
  v_freeze_end_point: string;
  v_freeze_init: string;
  v_freeze_reset: string;
  v_freeze_threshold: string;
}

export interface IndividualStatistics {
  f: number;
  gc: string;
  db: number;
}
export interface GenerationStatistics {
  bestIndividual: string;
  population: string[];
}

export interface GeneticAlgorithmStatistics {
  individuals: Map<string, IndividualStatistics>;
  generations: GenerationStatistics[];
}

export interface GeneticAlgorithmOptions {
  populationSize: number;
  crossoverRate: number;
  mutationRate: number;
  elitismCount: number;
  truthTable: TruthTable;
  simulationParameters: SimulationParameters;
}

export interface GeneticAlgorithmState {
  randomSeed: string;
  randomState: number;
  options: GeneticAlgorithmOptions;
  statistics: GeneticAlgorithmStatistics;
}

export interface DB {
  x: number;
  y: number;
  state: string;
  color: string;
  interval: number;
}