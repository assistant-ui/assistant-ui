/**
 * OAuth 2.1 Security Scheme Types for MCP Tools
 * Based on MCP Authorization Spec and ChatGPT Apps SDK
 */

/**
 * Tool requires no authentication - callable anonymously
 */
export interface NoAuthSecurityScheme {
  type: "noauth";
}

/**
 * Tool requires OAuth 2.0 access token
 */
export interface OAuth2SecurityScheme {
  type: "oauth2";
  /** Required scopes for this tool */
  scopes: string[];
}

/**
 * Union of all supported security schemes
 */
export type SecurityScheme = NoAuthSecurityScheme | OAuth2SecurityScheme;

/**
 * OAuth configuration for the MCP server (resource server)
 */
export interface OAuthResourceServerConfig {
  /** Canonical HTTPS URL of this MCP server (resource identifier) */
  resource: string;
  /** Authorization server URLs that can issue tokens for this resource */
  authorizationServers: string[];
  /** All scopes supported by this resource server */
  scopesSupported?: string[];
  /** Optional documentation URL */
  resourceDocumentation?: string;
  /** Bearer token methods supported (default: ["header"]) */
  bearerMethodsSupported?: ("header" | "body" | "query")[];
}

/**
 * Token claims expected in validated JWT
 */
export interface TokenClaims {
  /** Token issuer (must match authorization server) */
  iss: string;
  /** Token subject (user identifier) */
  sub: string;
  /** Token audience (must include resource server URL) */
  aud: string | string[];
  /** Expiration timestamp (Unix seconds) */
  exp: number;
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Not before timestamp (Unix seconds) */
  nbf?: number;
  /** Granted scopes (space-separated string or array) */
  scope?: string | string[];
  /** Additional claims */
  [key: string]: unknown;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Parsed claims if valid */
  claims?: TokenClaims;
  /** Error message if invalid */
  error?: string;
  /** Error code for WWW-Authenticate */
  errorCode?: "invalid_token" | "insufficient_scope" | "invalid_request";
}

/**
 * Request context with optional authentication
 */
export interface AuthenticatedRequest {
  /** Raw Authorization header value */
  authorizationHeader?: string;
  /** Extracted Bearer token (if present) */
  bearerToken?: string;
  /** Validated token claims (if authenticated) */
  claims?: TokenClaims;
  /** Whether request is authenticated */
  isAuthenticated: boolean;
}

/**
 * Context passed to tool execute function
 */
export interface ToolExecutionContext {
  /** Authenticated request info (if OAuth enabled) */
  auth?: AuthenticatedRequest;
  /** Request headers */
  headers?: Record<string, string>;
}
