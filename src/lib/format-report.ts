import zip from "lodash.zip";

const chunkTitle = /^##\s.+\.js$/gm;
const pkgHeader = /^[a-z-_@/.]+\s\(Found.+\)/gm;

const notEmpty = (str: string) => str.length > 0;

const splitAtLine = (line: number, string: string) => {
  const lines = string.split("\n");
  return [lines.slice(0, line).join("\n"), lines.slice(line).join("\n")];
};

type BodyData = [string, Array<[string, string]>];

const formatBody = (bodyData: BodyData[]) =>
  bodyData
    .map(
      ([chunk, depGroups]) =>
        chunk +
        "\n" +
        depGroups
          .map((depSet: [string, string]) =>
            [
              "<details>",
              `<summary>${depSet[0]}</summary>`,
              "<pre>",
              depSet[1]
                .replace(/[\n]+/gm, "\n")
                .replace(/^\s{2}/gm, "")
                .trim(),
              "</pre>",
              "</details>"
            ].join("\n")
          )
          .join("")
    )
    .join("\n\n");

export const formatReport = (report: string) => {
  let [header, bodyWithFooter] = splitAtLine(6, report);
  const [body] = splitAtLine(-6, bodyWithFooter);

  header = header.replace("* Duplicates", "**Duplicates**");
  header = header.replace("* Packages", "**Packages**");
  header = "## " + header;

  const footer =
    "\n<br/>\n\n" +
    "[Fixing bundle duplicates](https://github.com/FormidableLabs/inspectpack/#fixing-bundle-duplicates)\n" +
    "[An introductory guide](https://github.com/FormidableLabs/inspectpack/#diagnosing-duplicates)\n";

  const bodyLines = body.split("\n");
  const chunks = bodyLines
    .filter(line => line.match(chunkTitle))
    .map(chunk => "#" + chunk);

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

  return header + formatBody(bodyData as BodyData[]) + footer;
};
