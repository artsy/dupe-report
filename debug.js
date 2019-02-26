const { dupeReport } = require("./lib/index");

dupeReport({
  owner: "artsy",
  repo: "force",
  buildNum: 16872,
  dryRun: true
}).catch(err => console.error(err));
