const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export function resolveRegistryItemUrl(
  component: string,
  style?: string,
): string {
  const registryUrl = style?.startsWith("base-")
    ? `${REGISTRY_BASE_URL}/styles/${encodeURIComponent(style)}`
    : REGISTRY_BASE_URL;

  return `${registryUrl}/${encodeURIComponent(component)}.json`;
}
