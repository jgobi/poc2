#!/bin/env node
import fs from "fs";
import { parseXML, stringifyXML } from "../xml.js";

export function fixcolor(path) {
  const xml = parseXML(fs.readFileSync(path, "utf8"));
  const layers = xml.siqad.design.layer.find((l) => l.$type === "DB");

  const plain = layers.dbdot.filter((db) => db.color === "#ffc8c8c8");
  if (plain.length === 0) {
    return false;
  }

  const colored = layers.dbdot.filter((db) => db.color !== "#ffc8c8c8");

  layers.dbdot = [...colored, ...plain];

  fs.copyFileSync(path, path + ".bak");
  fs.writeFileSync(path, stringifyXML(xml));

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.error("Usage: node fixcolor.js ...paths.xml");
    process.exit(1);
  }

  const files = process.argv.slice(2);
  for (let file of files) {
    console.log("\nProcessing file: " + file);
    if (fixcolor(file)) {
      console.log("Backup file saved as: " + file + ".bak");
      console.log("Done");
    } else {
      console.log(
        "Could not fix colors without changing the design as there is no default colored DB in it."
      );
    }
  }
}
