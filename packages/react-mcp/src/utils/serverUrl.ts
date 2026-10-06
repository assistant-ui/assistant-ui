import type { MCPPersistedAuthState } from "../auth/types";

export const normalizeMcpServerUrl = (serverUrl: string): string =>
  new URL(serverUrl).toString();

const IPV4_LOOPBACK = /^127(?:\.\d{1,3}){3}$/;
const IPV4_MAPPED_LOOPBACK = /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/;

const isLoopbackHostname = (hostname: string): boolean => {
  const host = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    IPV4_LOOPBACK.test(host) ||
    host === "[::1]" ||
    IPV4_MAPPED_LOOPBACK.test(host)
  );
};

export const isSecureNetworkUrl = (serverUrl: string): boolean => {
  try {
    const url = new URL(serverUrl);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && isLoopbackHostname(url.hostname))
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
