import { randomUUID } from "crypto";
import alea from "./alea.cjs";

let RANDOM_SEED = randomUUID();
let random = new alea(RANDOM_SEED); // prng

function setRandomSeed(seed) {
  RANDOM_SEED = seed;
  random = new alea(seed);
}

export { RANDOM_SEED, random, setRandomSeed };
