import type {
  OAuthTokens,
  OAuthClientInformationFull,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/client";

export type MCPPersistedAuthState = {
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  state?: string;
  discoveryState?: OAuthDiscoveryState;
  /** Bearer token (entered at add-form time). */
  token?: string;
};
