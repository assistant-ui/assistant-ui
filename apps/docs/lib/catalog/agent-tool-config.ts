import { isAgentToolCartEntry, type CartEntry } from "../checkout/cart-entries";
export { isAgentToolCartEntry, type CartEntry } from "../checkout/cart-entries";

export const AGENT_TOOL_PRESETS = [
  {
    id: "web-search",
    name: "Web search",
    purpose:
      "Search the web for current information and return relevant results with source links.",
  },
  {
    id: "document-search",
    name: "Search documents",
    purpose:
      "Search the project's connected documents and return relevant passages with source references.",
  },
  {
    id: "app-state",
    name: "Read app state",
    purpose:
      "Read the current application state so the assistant can answer questions about what the user is viewing.",
  },
] as const;

export const cartEntrySlug = (entry: CartEntry) =>
  typeof entry === "string" ? entry : entry.slug;
export const cartEntryId = (entry: CartEntry) =>
  typeof entry === "string" ? entry : entry.id;

export const configuredToolInstructions = (entries: readonly CartEntry[]) => {
  const tools = entries.filter(isAgentToolCartEntry);
  if (tools.length === 0) return "";
  return [
    "Configure each of these agent tools as a separate tool in the existing assistant-ui toolkit:",
    ...tools.map(
      (tool, index) => `${index + 1}. ${tool.name}: ${tool.purpose}`,
    ),
    "Confirm the data sources, provider, access permissions, and credentials needed for each tool during setup. Do not invent integrations or use placeholder results. Reuse the project's existing tools where they satisfy the requested behavior.",
  ].join("\n");
};
