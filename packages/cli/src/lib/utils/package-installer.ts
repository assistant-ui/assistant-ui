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
  /**
   * Packages that already satisfy the need, beyond `packageName`. Lets a
   * renamed package accept its previous name so an existing install is not
   * duplicated. Defaults to `packageName` alone.
   */
  satisfiedBy?: string[];
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

  const satisfying = config.satisfiedBy ?? [config.packageName];
  if (satisfying.some((name) => isPackageInstalled(name))) {
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
