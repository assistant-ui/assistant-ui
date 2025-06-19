import { logger } from "../utils/logger.js";
import { copyRaw } from "./copy-raw.js";
import { prepareCodeExamples } from "./code-examples.js";

export async function prepare(): Promise<void> {
  logger.info("Starting documentation preparation...");

  try {
    await copyRaw();
    await prepareCodeExamples();

    logger.info("Documentation preparation complete");
  } catch (error) {
    logger.error("Documentation preparation failed", error);
    throw error;
  }
}

if (process.env.PREPARE === "true") {
  prepare().catch((error) => {
    logger.error("Preparation failed", error);
    process.exit(1);
  });
}
