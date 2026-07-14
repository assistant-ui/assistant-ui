import * as fs from "node:fs";
import * as path from "node:path";

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

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

export function resolveQuickStartRegistryUrl(style?: string): string {
  // The shadcn CLI appends a literal /json segment to fetched URLs containing
  // /chat/b/ unless they already end with it, so this item must use the direct
  // tree URLs rather than the /styles/ template.
  if (style === undefined || style.startsWith("base-")) {
    return `${REGISTRY_BASE_URL}/base/chat/b/ai-sdk-quick-start/json`;
  }

  return `${REGISTRY_BASE_URL}/chat/b/ai-sdk-quick-start/json`;
}

export function resolveRegistryItemUrl(
  component: string,
  style?: string,
): string {
  const registryUrl = style?.startsWith("base-")
    ? `${REGISTRY_BASE_URL}/styles/${encodeURIComponent(style)}`
    : REGISTRY_BASE_URL;

  return `${registryUrl}/${encodeURIComponent(component)}.json`;
}
