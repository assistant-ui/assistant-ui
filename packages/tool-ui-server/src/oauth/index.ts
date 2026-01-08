// Types
export type {
  SecurityScheme,
  NoAuthSecurityScheme,
  OAuth2SecurityScheme,
  OAuthResourceServerConfig,
  TokenClaims,
  TokenValidationResult,
  AuthenticatedRequest,
  ToolExecutionContext,
} from "../types/oauth";

// Schemas
export {
  SecuritySchemeSchema,
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
} from "../schemas/oauth";

export type { ProtectedResourceMetadata } from "../schemas/oauth";

// Protected Resource Metadata
export {
  generateProtectedResourceMetadata,
  collectScopesFromTools,
  validateResourceUrl,
} from "./protected-resource-metadata";

// Metadata Handler
export {
  createProtectedResourceMetadataHandler,
  PROTECTED_RESOURCE_METADATA_PATH,
  isProtectedResourceMetadataRequest,
} from "./metadata-handler";

// JWKS Client
export { JWKSClient, type JWKSClientOptions } from "./jwks-client";

// Token Validator
export {
  TokenValidator,
  type TokenValidatorOptions,
  createTokenValidator,
} from "./token-validator";

// Token Extraction
export {
  extractBearerToken,
  createAuthenticatedRequest,
} from "./extract-token";

// WWW-Authenticate Helpers
export {
  buildWWWAuthenticate,
  createWWWAuthenticateHelper,
  type WWWAuthenticateOptions,
  type AuthErrorCode,
} from "./www-authenticate";

// MCP Auth Errors
export {
  createMCPAuthError,
  createScopeUpgradeError,
  type MCPAuthErrorResult,
  type ScopeUpgradeOptions,
} from "./mcp-auth-error";
