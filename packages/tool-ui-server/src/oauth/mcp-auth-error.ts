/**
 * MCP tool result with authentication error
 *
 * This format triggers the OAuth UI in ChatGPT and compatible clients.
 */
export interface MCPAuthErrorResult {
  content: Array<{ type: "text"; text: string }>;
  _meta: {
    "mcp/www_authenticate": string[];
  };
  isError: true;
}

/**
 * Create an MCP tool result that triggers authentication
 *
 * @example
 * ```typescript
 * // In your tool handler:
 * if (!context.auth?.isAuthenticated) {
 *   return createMCPAuthError(
 *     "You must be logged in to access this feature",
 *     wwwAuthHelper.unauthorized()
 *   );
 * }
 * ```
 */
export function createMCPAuthError(
  userMessage: string,
  wwwAuthenticateHeader: string,
): MCPAuthErrorResult {
  return {
    content: [{ type: "text", text: userMessage }],
    _meta: {
      "mcp/www_authenticate": [wwwAuthenticateHeader],
    },
    isError: true,
  };
}

/**
 * Options for creating scope upgrade error
 */
export interface ScopeUpgradeOptions {
  /** Current scopes the user has */
  currentScopes?: string[];
  /** Scopes required for this operation */
  requiredScopes: string[];
  /** Custom user-facing message */
  message?: string;
}

/**
 * Create an MCP error for scope upgrade (step-up auth)
 */
export function createScopeUpgradeError(
  wwwAuthenticateHelper: {
    insufficientScope: (scopes: string[], desc?: string) => string;
  },
  options: ScopeUpgradeOptions,
): MCPAuthErrorResult {
  const { requiredScopes, message } = options;

  const defaultMessage = `This action requires additional permissions: ${requiredScopes.join(", ")}`;

  return createMCPAuthError(
    message ?? defaultMessage,
    wwwAuthenticateHelper.insufficientScope(requiredScopes),
  );
}
