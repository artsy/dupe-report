# @artsy/dupe-report

A tool for reporting on duplicate dependencies in a webpack bundle.

## Overview

Intended to be deployed to a now lambda, it exposes a simple REST api to perform a duplicate comparison between a PR and master.

This project currently has the baked in assumptions that you use CircleCI, GitHub, and Slack.

## API

```
GET /?owner={github_repo_owner}&repo={github_repo}&buildNum=${circle_ci_build_num}
```

There's an optional `dryRun` query param that an be used for debugging

## Deployment

To deploy a staging build scoped to your user use `yarn dev`.

For a production deployment use `yarn deploy`.
