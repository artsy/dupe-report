import dotenv from "dotenv";

const init = (() => {
  let loadedEnvs = false;

  return () => {
    if (loadedEnvs) return;

    loadedEnvs = true;
    dotenv.config();
  };
})();

export const safelyFetchEnvs = (envs: string[]) => {
  init();

  const missingEnvs: string[] = [];

  let envValues = envs.map(env => {
    let envValue = process.env[env];
    if (envValue === undefined) {
      missingEnvs.push(env);
    }
    return envValue;
  });

  if (missingEnvs.length > 0) {
    throw new Error(`Missing required env variable${missingEnvs.length === 1 ? "" : "s"} ${missingEnvs.join(", ")}`);
  }

  return envs.reduce(
    (acc, curr, i) => ({
      ...acc,
      [curr]: envValues[i]
    }),
    {}
  ) as { [key: string]: any };
};
