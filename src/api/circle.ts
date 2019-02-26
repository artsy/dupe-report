// Module
import axios from "axios";
import {
  Artifact,
  BuildSummary,
  CircleCI,
  CircleCIOptions,
  GitType,
  BuildWithSteps
} from "circleci-api";

import { safelyFetchEnvs } from "../lib/envs";

const { CIRCLE_TOKEN } = safelyFetchEnvs(["CIRCLE_TOKEN"]);

interface BuildSummaryExtended extends BuildSummary {
  workflows?: {
    job_name: string;
  };
}

interface PullRequest {
  head_sha: string;
  url: string;
}

interface BuildWithStepsExtended extends BuildWithSteps {
  pull_requests: PullRequest[];
}

interface FetchArtifactParams {
  jobName: string;
  artifactName: string;
  buildNum?: number;
  branchName?: string;
}

export class Circle {
  private owner: string;
  private repo: string;
  private api: CircleCI;

  constructor({ owner, repo }: { owner: string; repo: string }) {
    this.owner = owner;
    this.repo = repo;

    // Configure the factory with some defaults
    const options: CircleCIOptions = {
      // Required for all requests
      token: CIRCLE_TOKEN, // Set your CircleCi API token

      // Git information is required for project/build/etc endpoints
      vcs: {
        type: GitType.GITHUB, // default: github
        owner,
        repo
      }
    };

    // Create the api object
    this.api = new CircleCI(options);
  }

  async getPullRequest(buildNum: number): Promise<string | null> {
    let build;

    try {
      build = (await this.api.build(buildNum)) as BuildWithStepsExtended;
    } catch (error) {
      console.error(
        `Failed to get circle build details for job #${buildNum} of ${
          this.owner
        }/${this.repo}`
      );
      throw error;
    }

    if (build.pull_requests.length > 0 && build.branch !== "master") {
      return build.pull_requests[0].url;
    }

    return null;
  }

  /**
   * Grab the latest artifacts from a successful build on a certain branch
   * @param [branch="master"] - Artifacts for certain branch
   * @return List of successfully built artifact objects
   */
  async getLatestArtifacts(branch = "master"): Promise<Artifact[]> {
    try {
      // Will use the repo defined in the options above
      const result: Artifact[] = await this.api.latestArtifacts({
        branch,
        filter: "successful"
      });
      console.log(`Found ${result.length} artifacts`);
      return result;
    } catch (error) {
      console.log("No build artifacts found", error);
    }

    return [];
  }

  async fetchArtifact({
    jobName,
    artifactName,
    buildNum,
    branchName = "master"
  }: FetchArtifactParams): Promise<string | undefined> {
    let latestBuild;
    let artifact;

    if (!buildNum) {
      try {
        latestBuild = (await this.api.buildsFor(branchName, {
          filter: "successful",
          limit: 10
        })).filter(
          (build: BuildSummaryExtended) =>
            build.workflows && build.workflows.job_name === jobName
        )[0];
      } catch (error) {
        console.error(`Failed to find latest master ${jobName} job`);
        throw error;
      }
    }

    try {
      if (buildNum || latestBuild) {
        let targetArtifact = (await this.api.artifacts(
          // @ts-ignore
          buildNum || latestBuild.build_num!
        )).filter(artifact => artifact.path.includes(artifactName!))[0];
        if (targetArtifact && targetArtifact.url) {
          artifact = (await axios.get(targetArtifact.url)).data;
        }
      }
    } catch (error) {
      const branchText = buildNum ? "" : `latest ${branchName} `;
      const buildText = buildNum ? `#${buildNum} ` : "";
      console.error(
        `Found ${branchText}job ${buildText}but failed to fetch artifact`
      );
      throw error;
    }

    return artifact;
  }
}
