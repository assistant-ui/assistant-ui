import { logger } from "../utils/logger.js";
import { copyRaw } from "./copy-raw.js";
import { prepareCodeExamples } from "./code-examples.js";
import { pathToFileURL } from "node:url";

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

const entrypointUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (import.meta.url === entrypointUrl) {
  prepare().catch((error) => {
    logger.error("Preparation failed", error);
    process.exit(1);
  });
}
