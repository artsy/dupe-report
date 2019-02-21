import axios from "axios";
import { BuildSummary } from "circleci-api";

import { circleApi } from "../api/circle";

interface FetchMasterArtifactParams {
  jobName: string;
  artifactName: string;
}

interface BuildSummaryExtended extends BuildSummary {
  workflows?: {
    job_name: string;
  };
}

export const fetchMasterArtifact = async ({
  jobName,
  artifactName
}: FetchMasterArtifactParams): Promise<string | undefined> => {
  let latestBuild;
  let masterArtifact;

  try {
    latestBuild = (await circleApi.buildsFor("master", {
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

  try {
    if (latestBuild) {
      let targetArtifact = (await circleApi.artifacts(
        latestBuild.build_num!
      )).filter(artifact => artifact.path.includes(artifactName!))[0];
      if (targetArtifact && targetArtifact.url) {
        masterArtifact = (await axios.get(targetArtifact.url)).data;
      }
    }
  } catch (error) {
    console.error(
      "Found latest master job but failed to fetch master artifact"
    );
    throw error;
  }

  return masterArtifact;
};
