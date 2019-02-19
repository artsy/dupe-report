import axios from "axios";

import { circleApi } from "../api";

interface FetchMasterArtifactParams {
  jobName: string;
  artifactName: string;
}

export const fetchMasterArtifact = async ({
  jobName,
  artifactName
}: FetchMasterArtifactParams) => {
  let latestBuild;
  let masterArtifact = "ERROR?";

  try {
    latestBuild = (await circleApi.buildsFor("master", {
      filter: "successful",
      limit: 10
    })).filter(
      build => build.workflows && build.workflows.job_name === jobName
    )[0];
  } catch (error) {
    // tslint:disable-next-line:no-console
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
