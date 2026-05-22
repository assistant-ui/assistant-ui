import type { MCPAuthConfig } from "../mcp-scope";
import type { MCPPersistedAuthState } from "./types";

/**
 * Build request headers for the bearer/none flows. For bearer, prefer a token
 * stored at add-form time (persisted), falling back to a static token on the
 * config (used by connectors that hardcode a token, rare in practice).
 */
export function buildHeaders(
  auth: MCPAuthConfig,
  persisted: MCPPersistedAuthState | null,
): Record<string, string> | undefined {
  if (auth.type === "bearer") {
    const token = persisted?.token ?? auth.token;
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
  }
  return undefined;
}
