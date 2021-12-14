import alea from "./alea.cjs";
import { randomBytes } from "crypto";

const RANDOM_SEED = randomBytes(8).toString("hex"); // "nanocomp";
export const random = new alea(RANDOM_SEED); // prng
