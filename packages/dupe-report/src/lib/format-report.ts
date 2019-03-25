import zip from "lodash.zip";

const chunkTitle = /^##\s.+\.js$/gm;
const pkgHeader = /^[a-z-_@/.]+\s\(Found.+\)/gm;

const notEmpty = (str: string) => str.length > 0;

const splitAtLine = (line: number, string: string) => {
  const lines = string.split("\n");
  return [lines.slice(0, line).join("\n"), lines.slice(line).join("\n")];
};

type BodyData = [string, Array<[string, string]>];

export const collapsible = (title: string, body: string) =>
  ["<details>", `<summary>${title}</summary>\n`, body, "</details>"].join("\n");

const NO_CHANGE_MSG = "Same amount of additions as removals.";
const changedMessaging = (change: number) => {
  const changeAmount = Math.abs(change);
  const added = change > 0;

  const linesAdded =
    changeAmount === 0
      ? NO_CHANGE_MSG
      : `Roughly <b>${changeAmount}</b> line${changeAmount === 1 ? "" : "s"} ${added ? "added" : "removed"}. `;

  const changeTypeText =
    changeAmount === 0
      ? "There is likely no change."
      : `This is probably a${added ? " <i>regression</i>" : "n <i>improvement</i>"} over master.`;

  return linesAdded + " " + changeTypeText;
};

const formatBody = (bodyData: BodyData[]) =>
  bodyData
    .map(
      ([chunk, depGroups]) =>
        chunk +
        "\n" +
        depGroups
          .map((depSet: [string, string]) =>
            collapsible(
              depSet[0],
              [
                "<pre>",
                depSet[1]
                  .replace(/[\n]+/gm, "\n")
                  .replace(/^\s{2}/gm, "")
                  .trim(),
                "</pre>"
              ].join("\n")
            )
          )
          .join("")
    )
    .join("\n\n");

export const formatReport = (report: string, diff: string, change: number, assignees: string[]) => {
  let [header, bodyWithFooter] = splitAtLine(6, report);
  const [body] = splitAtLine(-6, bodyWithFooter);

  header = header.replace("* Duplicates", "**Duplicates**");
  header = header.replace("* Packages", "**Packages**");
  header = "## " + header;

  const footer =
    "[Fixing bundle duplicates](https://github.com/FormidableLabs/inspectpack/#fixing-bundle-duplicates) | " +
    "[An introductory guide](https://github.com/FormidableLabs/inspectpack/#diagnosing-duplicates)\n";

  const bodyLines = body.split("\n");
  const chunks = bodyLines.filter(line => line.match(chunkTitle)).map(chunk => "#" + chunk);

  const chunkDependencies = body
    .split(chunkTitle)
    .filter(notEmpty)
    .map(deps => {
      const depLines = deps.split("\n").filter(notEmpty);
      return zip(
        depLines.filter(line => line.match(pkgHeader)),
        deps
          .split(pkgHeader)
          .filter(notEmpty)
          .slice(1)
      );
    });

  const bodyData = zip(chunks, chunkDependencies);

  return (
    header +
    "\n\n" +
    changedMessaging(change) +
    "\n\n" +
    collapsible("Diff of duplicates in this branch vs master", diff) +
    "\n\n" +
    "<br/>" +
    "\n\n" +
    footer +
    "\n\n" +
    assignees.join(", ") +
    "\n\n" +
    "---" +
    "\n\n" +
    formatBody(bodyData as BodyData[])
  );
};
