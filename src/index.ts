import { diffLines } from "diff";

import { Circle } from "./api/circle";
import { GitHub } from "./api/github";
import { Slack } from "./api/slack";
import { formatReport } from "./lib/format-report";

const DUPE_IDENTIFIER = "<!-- DUPE:REPORT -->";
const jobName = "build";
const artifactName = "duplicates-report";

interface DupeReportArgs {
  owner: string;
  repo: string;
  buildNum: number;
  dryRun?: boolean;
}

export const dupeReport = async ({
  owner,
  repo,
  buildNum,
  dryRun = false
}: DupeReportArgs) => {
  const circle = new Circle({ owner, repo });
  const pullRequest = await circle.getPullRequest(buildNum);

  /** If a build has no PR associated with it we just skip the dupe report */
  if (!pullRequest) {
    console.log(
      `Exiting for build ${owner}/${repo} #${buildNum} because there was no PR`
    );
    return;
  }

  const github = new GitHub({ owner, repo, pullRequest, dryRun });
  const slack = new Slack({ dryRun });

  // Grab the report generated by CI (Retrieved from passed in buildNum)

  let localReport: string | undefined;
  try {
    localReport = await circle.fetchArtifact({
      jobName,
      artifactName,
      buildNum
    });
  } catch {
    console.error("failed to read local duplicate report");
  }

  if (!localReport) {
    console.log("local report is empty");
    localReport = "";
  }

  // Grab the master report. if no master go through new report flow, if no build error.

  let masterReport: string | undefined;
  try {
    masterReport = await circle.fetchArtifact({
      jobName,
      artifactName
    });
  } catch (error) {
    console.error("failed to fetch master report");
    throw error;
  }

  if (!masterReport) {
    console.log("master report is empty");
    masterReport = "";
  }

  // If everything's empty, just quit
  if (masterReport === "" && localReport === "") {
    console.log("Nothing to compare");
    return;
  }

  // Diff the reports

  let dupeDiff = "";
  let headerDiff = false;
  let hasDiff = false;
  let change = 0;

  const masterHeader = masterReport
    .trim()
    .split("\n")
    .slice(0, 4)
    .join("\n");

  const localHeader = localReport
    .trim()
    .split("\n")
    .slice(0, 4)
    .join("\n");

  if (masterHeader !== localHeader) {
    headerDiff = true;
  }

  diffLines(masterReport.trim(), localReport.trim(), {
    newlineIsToken: true
  }).forEach((line, lineNumber) => {
    let lineStart = " ";
    if (line.added) {
      hasDiff = true;
      lineStart = "+";
    } else if (line.removed) {
      hasDiff = true;
      lineStart = "-";
    }

    line.value.split("\n").forEach((l, lineOffset) => {
      lineStart === "+" && change++;
      lineStart === "-" && change--;
      dupeDiff += lineStart + l + "\n";
    });
  });
  dupeDiff = "```diff\n" + dupeDiff + "\n```";

  // Check the PR to see if there's an existing dupe-report comment

  let existingPRComment;
  try {
    existingPRComment = await github.checkForPRCommentWithString(
      DUPE_IDENTIFIER
    );
  } catch {
    console.error(
      "failed when trying to check to see if message existed on pr"
    );
  }

  // If there's no diff, remove the existing comment (if it exists) and quit
  console.log("diff info", { hasDiff, headerDiff, change });

  if (!hasDiff || (change === 0 && !headerDiff)) {
    if (existingPRComment) {
      try {
        await github.deleteComment(existingPRComment.id);
      } catch (error) {
        console.error(
          `Failed to delete comment ${
            existingPRComment.id
          } in PR ${pullRequest}`,
          error
        );
      }
    }
    console.log(
      `No change in build #${buildNum} in PR ${pullRequest}, exiting...`
    );
    return;
  }

  // Grab the ticket assignees to mention in the PR comment body

  let assignees: string[] = [];
  try {
    assignees = await github.getAssignees();
  } catch (error) {
    console.error("failed to fetch assignees", error.message);
  }

  // Format the report and build up the comment body

  let prComment = `${DUPE_IDENTIFIER}\n\n`;

  prComment += formatReport(localReport, dupeDiff, change, assignees);

  // Update the existing PR comment or create a new one

  try {
    if (existingPRComment) {
      await github.updateComment(existingPRComment.id, prComment);
    } else {
      await github.createComment(prComment);
    }
  } catch (error) {
    console.error(
      "failed to create dupe report comment with code",
      error.status
    );
  }

  if (existingPRComment) {
    console.log(
      `PR ${pullRequest} has likely already sent a slack notification, skipping...`
    );
    return;
  }

  // Ping the designated slack channel that there are changes

  if (change > 0) {
    await slack.send(
      [
        ":alert: the following pr likely introduces new duplicates into our webpack bundle. :alert:",
        pullRequest
      ].join("\n")
    );
  } else if (change < 0) {
    await slack.send(
      [
        "the following pr may remove some of the duplicates from our webpack bundle :crossed_fingers:.",
        pullRequest,
        "",
        "please check it out just in case."
      ].join("\n")
    );
  } else {
    await slack.send(
      [
        "the bundle duplicate report was updated in the following pr, but there's likely no real change.",
        pullRequest,
        "",
        "please check it out just in case."
      ].join("\n")
    );
  }
};
