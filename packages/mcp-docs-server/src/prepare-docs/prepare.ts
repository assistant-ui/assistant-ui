import { logger } from "../utils/logger.js";
import { copyRaw } from "./copy-raw.js";
import { prepareCodeExamples } from "./code-examples.js";

async function prepare(): Promise<void> {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  prepare().catch((error) => {
    logger.error("Preparation failed", error);
    process.exit(1);
  });
}
