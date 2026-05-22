// Server ids are joined with tool names via `__` to form unique tool
// names for the AI SDK. The separator must not appear inside ids,
// otherwise two distinct `(serverId, toolName)` pairs could produce
// the same composite name.
export function assertValidServerId(id: string): void {
  if (id.length === 0) {
    throw new Error("MCP server id must not be empty.");
  }
  if (id.includes("__")) {
    throw new Error(
      `MCP server id "${id}" must not contain "__" — that sequence is reserved for separating server id from tool name.`,
    );
  }
  if (id.includes("\x1f")) {
    throw new Error(
      `MCP server id "${id}" must not contain the ASCII Unit Separator (\\x1f) — it is reserved as the list delimiter in primitive id-list selectors.`,
    );
  }
}
