// Module
import { Artifact, CircleCI, CircleCIOptions, GitType } from "circleci-api";

import { safelyFetchEnvs } from "../lib/envs";

const {
  CIRCLE_TOKEN,
  CIRCLE_PROJECT_USERNAME,
  CIRCLE_PROJECT_REPONAME
} = safelyFetchEnvs([
  "CIRCLE_TOKEN",
  "CIRCLE_PROJECT_USERNAME",
  "CIRCLE_PROJECT_REPONAME"
]);

// Configure the factory with some defaults
const options: CircleCIOptions = {
  // Required for all requests
  token: CIRCLE_TOKEN, // Set your CircleCi API token

  // Optional
  // Anything set here can be overriden when making the request

  // Git information is required for project/build/etc endpoints
  vcs: {
    type: GitType.GITHUB, // default: github
    owner: CIRCLE_PROJECT_USERNAME,
    repo: CIRCLE_PROJECT_REPONAME
  }
};

// Create the api object
const api = new CircleCI(options);

export { api as circleApi };

// Use the api

/**
 * Grab the latest artifacts from a successful build on a certain branch
 * @param [branch="master"] - Artifacts for certain branch
 * @return List of successfully built artifact objects
 */
export async function getLatestArtifacts(
  branch = "master"
): Promise<Artifact[]> {
  try {
    // Will use the repo defined in the options above
    const result: Artifact[] = await api.latestArtifacts({
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
