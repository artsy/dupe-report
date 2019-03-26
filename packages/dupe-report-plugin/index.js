const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const mkdirp = require("make-dir");
const stripAnsi = require("strip-ansi");
const { DuplicatesPlugin } = require("inspectpack/plugin");

const writeFile = promisify(fs.writeFile);

export class DuplicateReportPlugin {
  constructor({ directory = path.join(process.cwd(), ".artifacts"), fileName = "duplicates-report" }) {
    return new DuplicatesPlugin({
      verbose: true,
      emitHandler(report) {
        mkdirp(directory)
          .then(() => writeFile(path.join(directory, fileName), stripAnsi(report)))
          .catch(err => {
            console.error("[DuplicatesPlugin] Could not write duplicates report");
            throw new Error(err);
          });
      }
    });
  }
}
