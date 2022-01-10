import { nanoid } from 'nanoid';
import alea from "./alea.cjs";

let RANDOM_SEED = nanoid();
let random = new alea(RANDOM_SEED); // prng

function setRandomSeed(seed) {
  RANDOM_SEED = seed;
  random = new alea(seed);
}

export { RANDOM_SEED, random, setRandomSeed };
