import type { OAuthResourceServerConfig } from "../types/oauth";

/**
 * WWW-Authenticate challenge error codes
 */
export type AuthErrorCode =
  | "invalid_request"
  | "invalid_token"
  | "insufficient_scope";

/**
 * Options for building WWW-Authenticate header
 */
export interface WWWAuthenticateOptions {
  /** Error code */
  error: AuthErrorCode;
  /** Human-readable error description */
  errorDescription?: string;
  /** Protected resource metadata URL */
  resourceMetadataUrl?: string;
  /** Required scopes for the request */
  scope?: string[];
  /** Realm (optional) */
  realm?: string;
}

/**
 * Build a WWW-Authenticate header value for Bearer authentication
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6750#section-3
 *
 * @example
 * ```typescript
 * const header = buildWWWAuthenticate({
 *   error: "insufficient_scope",
 *   errorDescription: "The access token does not have the required scopes",
 *   scope: ["files:read", "files:write"],
 *   resourceMetadataUrl: "https://mcp.example.com/.well-known/oauth-protected-resource",
 * });
 * // Bearer error="insufficient_scope", error_description="The access token...",
 * // scope="files:read files:write", resource_metadata="https://..."
 * ```
 */
export function buildWWWAuthenticate(options: WWWAuthenticateOptions): string {
  const parts: string[] = [];

  if (options.realm) {
    parts.push(`realm="${escapeQuotes(options.realm)}"`);
  }

  parts.push(`error="${options.error}"`);

  if (options.errorDescription) {
    parts.push(`error_description="${escapeQuotes(options.errorDescription)}"`);
  }

  if (options.scope && options.scope.length > 0) {
    parts.push(`scope="${options.scope.join(" ")}"`);
  }

  if (options.resourceMetadataUrl) {
    parts.push(`resource_metadata="${options.resourceMetadataUrl}"`);
  }

  return `Bearer ${parts.join(", ")}`;
}

/**
 * Escape double quotes in header values
 */
function escapeQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}

/**
 * Create a helper for building WWW-Authenticate headers with resource config
 */
export function createWWWAuthenticateHelper(config: OAuthResourceServerConfig) {
  const resourceMetadataUrl = `${config.resource}/.well-known/oauth-protected-resource`;

  return {
    /**
     * Build challenge for missing token
     */
    unauthorized(description?: string): string {
      return buildWWWAuthenticate({
        error: "invalid_request",
        errorDescription: description ?? "Authorization required",
        resourceMetadataUrl,
      });
    },

    /**
     * Build challenge for invalid token
     */
    invalidToken(description?: string): string {
      return buildWWWAuthenticate({
        error: "invalid_token",
        errorDescription:
          description ?? "The access token is invalid or expired",
        resourceMetadataUrl,
      });
    },

    /**
     * Build challenge for insufficient scope
     */
    insufficientScope(requiredScopes: string[], description?: string): string {
      return buildWWWAuthenticate({
        error: "insufficient_scope",
        errorDescription:
          description ?? "The access token does not have the required scopes",
        scope: requiredScopes,
        resourceMetadataUrl,
      });
    },
  };
}
