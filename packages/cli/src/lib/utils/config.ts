import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "./logger";

export interface AssistantUIConfig {
  $schema?: string;
  style?: string;
  tailwind?: {
    config?: string;
    css?: string;
    baseColor?: string;
    cssVariables?: boolean;
  };
  aliases?: {
    components?: string;
    utils?: string;
    ui?: string;
    lib?: string;
  };
}

const CONFIG_FILE_NAMES = [
  "assistant-ui.json",
  "components.json", // For backward compatibility with shadcn
];

export function getConfig(
  cwd: string = process.cwd(),
): AssistantUIConfig | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(cwd, fileName);
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configContent) as AssistantUIConfig;
      } catch (error) {
        const errorDetails =
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error);
        logger.error(`Error reading config file ${fileName}: ${errorDetails}`);
      }
    }
  }
  return null;
}

export function saveConfig(
  config: AssistantUIConfig,
  cwd: string = process.cwd(),
): void {
  const configPath = path.join(cwd, "assistant-ui.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function hasConfig(cwd: string = process.cwd()): boolean {
  return CONFIG_FILE_NAMES.some((fileName) =>
    fs.existsSync(path.join(cwd, fileName)),
  );
}
