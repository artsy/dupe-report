import { Command, flags } from "@oclif/command";
import { diffLines } from "diff";
import { promises as fs } from "fs";

import { GitHub } from "./api/github";
import { Slack } from "./api/slack";
import { fetchMasterArtifact } from "./lib/artifacts";
import { safelyFetchEnvs } from "./lib/envs";
import { formatReport } from "./lib/format-report";

const { CIRCLE_PULL_REQUEST } = safelyFetchEnvs(["CIRCLE_PULL_REQUEST"]);

const DUPE_IDENTIFIER = "<!-- DUPE:REPORT -->";

class ArtsyDupeReport extends Command {
  static description = "describe the command here";

  static args = [
    {
      name: "localDupeReport",
      required: true,
      description: "Path to the duplicate report to compare"
    }
  ];

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

    "dry-run": flags.boolean({
      char: "d",
      description: "Log what would happen without actually writing any results",
      default: false
    }),

    "artifact-name": flags.string({
      char: "A",
      description: "Name of the artifact in CircleCI",
      default: "duplicates-report"
    })
  };

  async run() {
    const { args, flags } = this.parse(ArtsyDupeReport);
    const { localDupeReport } = args;

    const github = new GitHub({ dryRun: flags["dry-run"] });
    const slack = new Slack({ dryRun: flags["dry-run"] });

    // 1. Grab the local report (that should be generated by CI)

    let localReport = "";
    try {
      localReport = await fs.readFile(localDupeReport, "utf8");
    } catch {
      console.error("Failed to read local duplicate report");
      process.exit(1);
    }

    // 2. Grab the master report. If no master go through new report flow, if no build error.

    let masterReport: string | undefined;
    try {
      masterReport = await fetchMasterArtifact({
        jobName: flags.job!,
        artifactName: flags["artifact-name"]!
      });
    } catch (error) {
      console.error("Failed to fetch master report", error);
      process.exit(1);
    }

    if (!masterReport) {
      console.log("Master report is empty");
      masterReport = "";
    }

    // 3. Diff the reports... if there's a diff proceed

    let dupeDiff = "";
    let hasDiff = false;
    let change = 0;

    diffLines(masterReport.trim(), localReport.trim(), {
      newlineIsToken: true
    }).forEach(line => {
      let lineStart = " ";
      if (line.added) {
        hasDiff = true;
        lineStart = "+";
      } else if (line.removed) {
        hasDiff = true;
        lineStart = "-";
      }

      line.value.split("\n").forEach(l => {
        lineStart === "+" && change++;
        lineStart === "-" && change--;
        dupeDiff += lineStart + l + "\n";
      });
    });
    dupeDiff = "```diff\n" + dupeDiff + "\n```";

    if (!hasDiff) return;

    // 4. Format report

    let assignees: string[] = [];
    try {
      assignees = await github.getAssignees();
    } catch {
      console.error("Failed to fetch assignees");
      process.exit(1);
    }

    let prComment = `${DUPE_IDENTIFIER}\n\n`;

    prComment += formatReport(localReport, dupeDiff, change, assignees);

    // 5. Check the current issue for a previous comment or create a new comment

    let existingPRComment;
    try {
      existingPRComment = await github.checkForPRCommentWithString(
        DUPE_IDENTIFIER
      );
    } catch {
      console.error(
        "Failed when trying to check to see if message existed on PR"
      );
    }

    try {
      if (existingPRComment) {
        await github.updateComment(existingPRComment.id, prComment);
      } else {
        await github.createComment(prComment);
      }
    } catch (error) {
      console.error(
        "Failed to create dupe report comment with code",
        error.status
      );
      process.exit(1);
    }

    // 6. Ping the client infra channel on slack

    if (change > 0) {
      slack.send(
        [
          ":alert: The following PR likely introduces new duplicates into our webpack bundle. :alert:",
          CIRCLE_PULL_REQUEST
        ].join("\n")
      );
    } else if (change < 0) {
      slack.send(
        [
          "The following PR may remove some of the duplicates from our webpack bundle :crossed_fingers:.",
          CIRCLE_PULL_REQUEST,
          "",
          "Please check it out just in case."
        ].join("\n")
      );
    } else {
      slack.send(
        [
          "The bundle duplicate report was updated in the following PR, but there's likely no real change.",
          CIRCLE_PULL_REQUEST,
          "",
          "Please check it out just in case."
        ].join("\n")
      );
    }
  }
}

export = ArtsyDupeReport;
