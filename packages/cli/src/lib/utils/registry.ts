import * as fs from "node:fs";
import * as path from "node:path";

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export function resolveRegistryItemUrl(
  component: string,
  style?: string,
): string {
  const registryUrl = style?.startsWith("base-")
    ? `${REGISTRY_BASE_URL}/styles/${style}`
    : REGISTRY_BASE_URL;

  return `${registryUrl}/${encodeURIComponent(component)}.json`;
}

export function getComponentsJsonStyle(cwd: string): string | undefined {
  try {
    const configPath = path.join(cwd, "components.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      style?: unknown;
    };

    return typeof config.style === "string" ? config.style : undefined;
  } catch {
    return undefined;
  }
}
