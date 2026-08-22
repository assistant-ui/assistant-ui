import { scanForImport } from "./file-scanner";
import {
  isPackageInstalled,
  askQuestion,
  installPackage,
} from "./package-manager";
import { logger } from "./logger";

export interface PackageInstallConfig {
  packageName: string;
  importPatterns: string[];
  promptMessage: string;
  skipMessage: string;
  notFoundMessage: string;
}

export async function installPackageIfNeeded(
  config: PackageInstallConfig,
): Promise<void> {
  const found = scanForImport(config.importPatterns);

  if (!found) {
    logger.info(config.notFoundMessage);
    return;
  }

  if (isPackageInstalled(config.packageName)) {
    logger.info(config.skipMessage);
    return;
  }

  const answer = await askQuestion(config.promptMessage);
  if (answer === "" || answer.toLowerCase().startsWith("y")) {
    await installPackage(config.packageName);
  } else {
    logger.info("Skipping installation.");
  }
}
