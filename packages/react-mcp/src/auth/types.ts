import type {
  OAuthTokens,
  OAuthClientInformationFull,
} from "@modelcontextprotocol/sdk/shared/auth.js";

export type MCPPersistedAuthState = {
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  codeVerifier?: string;
  /** Bearer token (entered at add-form time). */
  token?: string;
};
