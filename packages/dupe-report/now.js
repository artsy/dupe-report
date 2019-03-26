/**
 * Zeit Now lambda
 *
 * An endpoint that CI can call to trigger a bundle report
 */

const { dupeReport } = require("./lib/index");
const { parse } = require("url");

module.exports = (req, res) => {
  const { query } = parse(req.url, true);
  const { owner = "artsy", repo = "force", buildNum, dryRun = false } = query;

  let parsedOwner = String(owner);
  let parsedRepo = String(repo);
  let parsedDryRun = Boolean(dryRun);
  let parsedBuildNum = parseInt(buildNum);

  if (
    parsedBuildNum < 0 ||
    parsedBuildNum === NaN ||
    parsedBuildNum === Infinity
  ) {
    return res.end("buildNum invalid");
  }

  console.log("invoked with", { owner, repo, buildNum, dryRun });

  dupeReport({
    owner: parsedOwner,
    repo: parsedRepo,
    buildNum: parsedBuildNum,
    dryRun: parsedDryRun
  })
    .then(() => {
      res.writeHead(200);
      res.end("Success");
    })
    .catch(err => {
      console.error(err);
      res.writeHead(500);
      res.end("Something went wrong!");
    });
};
