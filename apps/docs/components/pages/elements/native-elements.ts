export const NATIVE_SHOWCASE_URL =
  "https://assistant-ui-expo.vercel.app/showcase";

const NATIVE_REGISTRY_NAMES: Record<string, string> = {
  "typing-indicator": "elements-typing-indicator",
  "error-state": "elements-error-state",
  "stopped-run": "elements-stopped-run",
  "tool-timeline": "elements-tool-timeline",
  "agent-status": "elements-agent-status",
  "approval-card": "elements-approval-card",
  "conversation-map": "elements-conversation-map",
};

export const NATIVE_ELEMENT_SLUGS = Object.keys(NATIVE_REGISTRY_NAMES);

export function getNativeRegistryName(slug: string): string | undefined {
  return NATIVE_REGISTRY_NAMES[slug];
}
