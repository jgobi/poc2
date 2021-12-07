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
  if (process.argv.length < 5) {
    console.error("Usage: node colorize.js path.xml number_to_color color_hex");
    process.exit(1);
  }
  colorize(process.argv[2], process.argv[3], process.argv[4]);
  console.log("Backup file saved as: " + process.argv[2] + ".bak");
  console.log("Done");
}
