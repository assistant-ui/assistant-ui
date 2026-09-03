import type {
  OAuthTokens,
  OAuthClientInformationFull,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/client";

export type MCPPersistedAuthState = {
  /** MCP server URL this authentication state belongs to. */
  serverUrl?: string;
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  state?: string;
  discoveryState?: OAuthDiscoveryState;
  /** Bearer token (entered at add-form time). */
  token?: string;
};
