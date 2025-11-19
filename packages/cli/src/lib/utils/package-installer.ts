import { scanForImport } from "./file-scanner";
import {
  isPackageInstalled,
  askQuestion,
  installPackage,
} from "./package-manager";

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
    console.log(config.notFoundMessage);
    return;
  }

  if (isPackageInstalled(config.packageName)) {
    console.log(config.skipMessage);
    return;
  }

  const answer = await askQuestion(config.promptMessage);
  if (answer === "" || answer.toLowerCase().startsWith("y")) {
    await installPackage(config.packageName);
  } else {
    console.log("Skipping installation.");
  }
}
