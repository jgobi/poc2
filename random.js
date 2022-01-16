import { randomUUID } from "crypto";
import alea from "./alea.cjs";

let RANDOM_SEED = randomUUID();
let random = new alea(RANDOM_SEED); // prng

function setRandomSeed(seed, state) {
  RANDOM_SEED = seed;
  random = new alea(seed);
  if (state && state > 0) {
    for (let i = 0; i < state; i++) random.double();
  }
}

export { RANDOM_SEED, random, setRandomSeed };
