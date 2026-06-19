import chalk from "chalk";
import createDebug from "debug";

/**
 * single debug instance, gated by the DEBUG env var. enabled when DEBUG matches
 * the "aui" namespace — i.e. DEBUG=aui, DEBUG=aui*, or DEBUG=*.
 */
const debugLog = createDebug("aui");

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue(message));
  },
  success: (message: string) => {
    console.log(chalk.green(`✓ ${message}`));
  },
  error: (message: string) => {
    console.error(chalk.red(`✗ ${message}`));
  },
  warn: (message: string) => {
    console.log(chalk.yellow(`⚠ ${message}`));
  },
  step: (message: string) => {
    console.log(chalk.cyan(`→ ${message}`));
  },
  break: () => {
    console.log("");
  },
};

export const debug = (message: string) => {
  if (debugLog.enabled) {
    console.log(chalk.gray(`DEBUG: ${message}`));
  }
};
