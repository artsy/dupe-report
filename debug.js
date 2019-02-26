const { dupeReport } = require("./lib/index");

dupeReport({ owner: "artsy", repo: "force", buildNum: 16867, dryRun: true });
