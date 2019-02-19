import { Command, flags } from "@oclif/command";
import axios from "axios";

import { circleApi } from "./api";
import { fetchMasterArtifact } from "./lib/artifacts";

class ArtsyDupeReport extends Command {
  static description = "describe the command here";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),

    mention: flags.string({
      char: "m",
      description: "GitHub users you want to mention for this change",
      multiple: true
    }),

    job: flags.string({
      char: "j",
      description: "CircleCI job that generates the report",
      default: "build"
    }),

    "artifact-name": flags.string({
      char: "A",
      description: "Name of the artifact in CircleCI",
      default: "duplicates-report"
    })
  };

  async run() {
    const { flags } = this.parse(ArtsyDupeReport);

    // TODO: Implement these steps
    //
    // 1. Download duplicate report from current build AND latest master build

    let masterArtifact = await fetchMasterArtifact({
      jobName: flags.job!,
      artifactName: flags["artifact-name"]!
    });

    console.log(masterArtifact);

    // 2. If there's a report for both, proceed. If no master go through new report flow, if no build error.
    // 3. Diff the reports... if there's a diff proceed (use diff -U 1000000 a.txt b.txt)
    // 4. Format report and add master diff
    // 5. Check the current issue for a previous comment or create a new comment
    // 6. mention the author and me in the PR comment
    // 7. Ping the client infra channel on slack
  }
}

export = ArtsyDupeReport;
