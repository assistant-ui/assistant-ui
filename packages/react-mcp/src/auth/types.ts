import type {
  OAuthTokens,
  OAuthClientInformationFull,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/client";

export type MCPPersistedAuthState = {
  /** MCP server URL this authentication state belongs to. Required with credentials. */
  serverUrl?: string;
  tokens?: OAuthTokens;
  tokensClientId?: string;
  clientInformation?: OAuthClientInformationFull;
  clientInformationSource?: "registered";
  codeVerifier?: string;
  state?: string;
  discoveryState?: OAuthDiscoveryState;
  /** Host-persisted bearer token. Must be paired with serverUrl. */
  token?: string;
};
