const { dupeReport } = require("./lib/index");

dupeReport({
  owner: "artsy",
  repo: "force",
  buildNum: 16953,
  dryRun: true
}).catch(err => console.error(err));
