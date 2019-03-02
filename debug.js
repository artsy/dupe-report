const { dupeReport } = require("./lib/index");

dupeReport({
  owner: "artsy",
  repo: "force",
  buildNum: 17765,
  dryRun: true
}).catch(err => console.error(err));
