import fs from "fs";
import { parseXML, stringifyXML } from "../xml.js";

export function colorize(path, n, color) {
  const xml = parseXML(fs.readFileSync(path, "utf8"));
  const dbs = xml.siqad.design.layer.find((l) => l.$type === "DB").dbdot;

  for (let i = dbs.length - 1; i >= dbs.length - n && i >= 0; i--) {
    dbs[i].color = color;
  }

  fs.copyFileSync(path, path + ".bak");
  fs.writeFileSync(path, stringifyXML(xml));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (
    process.argv.length < 4 ||
    !["in", "out", "area"].includes(process.argv[3])
  ) {
    console.error("Usage: node colorize.js path.xml area|in|out [nth]");
    process.exit(1);
  }

  const nth = +process.argv[4];
  const suf = nth.toString().padStart(2, "0");

  if (process.argv[3] === "area") {
    colorize(process.argv[2], 4, "#ff00ffff");
  } else if (Number.isNaN(nth) || nth < 0 || nth > 99) {
    console.error("nth must be between 0 and 99, both inclusive");
    process.exit(1);
  } else if (process.argv[3] === "in") {
    colorize(process.argv[2], 1, "#ffffff" + suf);
  } else if (process.argv[3] === "out") {
    colorize(process.argv[2], 2, "#ffff00" + suf);
  }
  console.log("Backup file saved as: " + process.argv[2] + ".bak");
  console.log("Done");
}
