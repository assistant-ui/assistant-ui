const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export function resolveQuickStartRegistryUrl(style?: string): string {
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
