import chalk from "chalk";

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
