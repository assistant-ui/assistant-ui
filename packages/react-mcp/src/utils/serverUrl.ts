import type { MCPPersistedAuthState } from "../auth/types";

export const normalizeMcpServerUrl = (serverUrl: string): string =>
  new URL(serverUrl).toString();

export const isSecureNetworkUrl = (serverUrl: string): boolean => {
  try {
    const url = new URL(serverUrl);
    const isIpv4Loopback = /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" ||
          url.hostname.endsWith(".localhost") ||
          isIpv4Loopback ||
          url.hostname === "[::1]"))
    );
  } catch {
    return false;
  }
};

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
