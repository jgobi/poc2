import alea from "./alea.cjs";
import { randomBytes } from "crypto";

let RANDOM_SEED = randomBytes(8).toString("hex");
let random = new alea(RANDOM_SEED); // prng

function setRandomSeed(seed) {
  RANDOM_SEED = seed;
  random = new alea(seed);
}

export { RANDOM_SEED, random, setRandomSeed };
