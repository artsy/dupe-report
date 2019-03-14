import { IncomingWebhook } from "@slack/client";

import { safelyFetchEnvs } from "../lib/envs";

const { SLACK_WEBHOOK_URL } = safelyFetchEnvs(["SLACK_WEBHOOK_URL"]);

interface SlackOptions {
  dryRun: boolean;
}

export class Slack {
  private readonly slack: IncomingWebhook;
  private readonly dryRun: boolean;

  constructor({ dryRun }: SlackOptions) {
    this.dryRun = dryRun;
    this.slack = new IncomingWebhook(SLACK_WEBHOOK_URL);
  }

  public async send(message: string) {
    if (!this.dryRun) {
      console.log("Attempting to send slack message:");
      console.log(message);
      return this.slack.send(message);
    } else {
      console.log(
        "\n" +
          message
            .split("\n")
            .map(line => `[slack] ${line}`)
            .join("\n"),
        "\n"
      );
      return Promise.resolve();
    }
  }
}
