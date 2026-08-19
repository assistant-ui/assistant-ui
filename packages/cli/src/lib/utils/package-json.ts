import { logger } from "./logger";

export function logPackageJsonParseError(
  packageJsonPath: string,
  commandName: string,
) {
  logger.error("Could not parse package.json.");
  console.error(`Package path: ${packageJsonPath}`);
  console.error(
    `Fix the JSON syntax in that file, then run: assistant-ui ${commandName}`,
  );
}
