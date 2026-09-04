import type { MCPPersistedAuthState } from "../auth/types";

export const normalizeMcpServerUrl = (serverUrl: string): string =>
  new URL(serverUrl).toString();

export const isAuthStateForServerUrl = (
  state: MCPPersistedAuthState | null,
  serverUrl: string,
): boolean => {
  if (state?.serverUrl === undefined) return false;
  try {
    return (
      normalizeMcpServerUrl(state.serverUrl) ===
      normalizeMcpServerUrl(serverUrl)
    );
  } catch {
    return false;
  }
};

export const hasPersistedCredentials = (
  state: MCPPersistedAuthState | null,
): boolean => Boolean(state?.tokens) || Boolean(state?.token);
