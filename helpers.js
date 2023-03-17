import systemConsole, { Console } from "console";
import { createWriteStream } from "fs";

export function createLogger(path, errorPath) {
  const file = createWriteStream(path, { encoding: "utf-8", flags: "w" });
  const errorFile = errorPath
    ? createWriteStream(errorPath, { encoding: "utf-8", flags: "w" })
    : file;
  const myConsole = new Console(file, errorFile);

  return {
    log(...args) {
      systemConsole.log(...args);
      myConsole.log(...args);
    },
    error(...args) {
      systemConsole.error(...args);
      myConsole.error(...args);
    },
    write(str) {
      process.stdout.write(str);
      file.write(str);
    },
  };
}
