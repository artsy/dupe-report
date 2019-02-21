import retry from "@octokit/plugin-retry";
import throttling from "@octokit/plugin-throttling";
import GitHubApi from "@octokit/rest";

import { safelyFetchEnvs } from "../lib/envs";

// @ts-ignore
const GitHubWithPlugins = GitHubApi.plugin(throttling).plugin(retry);

const {
  CIRCLE_PROJECT_USERNAME,
  CIRCLE_PROJECT_REPONAME,
  CIRCLE_PULL_REQUEST,
  GH_TOKEN
} = safelyFetchEnvs([
  "CIRCLE_PROJECT_USERNAME",
  "CIRCLE_PROJECT_REPONAME",
  "CIRCLE_PULL_REQUEST",
  "GH_TOKEN"
]);

interface IssueOptions {
  owner: string;
  repo: string;
  number: number;
}
const ISSUE = {
  owner: CIRCLE_PROJECT_USERNAME,
  repo: CIRCLE_PROJECT_REPONAME,
  number: CIRCLE_PULL_REQUEST.split("/").slice(-1)[0]
};

type GitHubOptions = Partial<IssueOptions> & {
  dryRun: boolean;
};

export class GitHub {
  private _github: GitHubApi;
  private _issueOpts: IssueOptions;

  constructor({ dryRun, ...issueOpts }: GitHubOptions) {
    this._github = new GitHubWithPlugins({
      auth: `token ${GH_TOKEN}`,

      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          this._github.log.warn(
            `Request quota exhausted for request ${options.method} ${
              options.url
            }`
          );

          // retry three times
          if (options.request.retryCount < 3) {
            console.log(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onAbuseLimit: (_retryAfter: number, options: any) => {
          // does not retry, only logs an error
          console.error(
            `Abuse detected for request ${options.method} ${options.url}`
          );
        }
      }
    });

    this._issueOpts = { ...ISSUE, ...issueOpts };

    if (dryRun) {
      this._github.hook.wrap("request", (req, opts) => {
        if (opts.method === "GET") {
          return req(opts);
        }
        // tslint:disable-next-line:no-unused
        const { headers, request, body, method, ...otherOptions } = opts;
        console.log(`\nAttempting ${method} with options`, otherOptions);
        if (body) {
          console.log("body present but omitted for brevity");
        }
        return {
          data: []
        };
      });
    }
  }

  public async checkForPRCommentWithString(match: string) {
    const comments = await this._github.issues.listComments({
      ...this._issueOpts
    });
    return comments.data.find(comment => comment.body.includes(match));
  }

  public updateComment(comment_id: number, body: string) {
    return this._github.issues.updateComment({
      ...this._issueOpts,
      comment_id,
      body
    });
  }

  public createComment(body: string) {
    return this._github.issues.createComment({
      ...this._issueOpts,
      body
    });
  }

  public async getAssignees() {
    let issue = await this._github.issues.get({
      ...this._issueOpts
    });
    let assignees = issue.data.assignees.map(assignee => `@${assignee.login}`);
    return Array.from(new Set([...assignees, "@zephraph"]));
  }
}
