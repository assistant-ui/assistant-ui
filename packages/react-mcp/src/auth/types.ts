import type {
  OAuthTokens,
  OAuthClientInformationFull,
} from "@modelcontextprotocol/client";

export type MCPPersistedAuthState = {
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  /** Bearer token (entered at add-form time). */
  token?: string;
};
