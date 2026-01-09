# OAuth Implementation Plan for @assistant-ui/tool-ui-server

## Overview

Implement OAuth 2.1 authentication support for `@assistant-ui/tool-ui-server`, following the MCP authorization specification and maintaining compatibility with ChatGPT Apps SDK patterns. This enables tools to authenticate users via external identity providers (Auth0, Okta, Cognito, etc.).

## Current State Analysis

### What We Have

1. **Assistant Cloud Authentication** (`packages/cloud/src/AssistantCloudAuthStrategy.tsx`)
   - JWT strategy with token caching and expiry handling
   - API key strategy with Bearer token
   - Anonymous strategy with refresh token management
   - Auth provider integration (Clerk, Auth0, Supabase, Firebase, Stytch, Kinde)

2. **Registry API Authentication** (`packages/tool-ui-server/src/registry-api.ts`)
   - Simple Bearer token authentication for publish operations
   - `ASSISTANT_UI_TOKEN` environment variable for CLI

3. **Tool UI Server** (`packages/tool-ui-server/`)
   - No OAuth-specific implementation
   - No security schemes on tools
   - No token management for widget-to-external-API flows

### What We Need

Based on ChatGPT Apps SDK and MCP authorization spec research:

1. **Security Schemes** - Per-tool authentication requirements (`noauth`, `oauth2`)
2. **Protected Resource Metadata** - RFC 9728 discovery endpoint
3. **OAuth Flow Integration** - Authorization code + PKCE support
4. **Token Management** - Validation, refresh, storage patterns
5. **WWW-Authenticate Challenges** - Proper error responses to trigger auth UI

## Desired End State

After this plan is complete:

1. Tools can declare security schemes (`noauth`, `oauth2` with scopes)
2. MCP server exposes `/.well-known/oauth-protected-resource` metadata
3. Clients can discover authorization servers and required scopes
4. Token validation utilities are available for tool handlers
5. WWW-Authenticate error responses trigger client auth flows
6. Full compatibility with ChatGPT's MCP authorization implementation

### Verification Criteria

- Security schemes are validated in tool registration
- Protected resource metadata endpoint returns valid RFC 9728 response
- Token validation utilities correctly verify JWTs
- WWW-Authenticate helper generates spec-compliant challenges
- Integration tests cover full OAuth flow simulation
- TypeScript types are complete and exported

## What We're NOT Doing

- **Implementing an Authorization Server** - We're a resource server; use Auth0/Okta/etc.
- **Dynamic Client Registration (DCR)** - Handled by identity providers
- **Storing User Sessions** - Stateless token validation only
- **Widget-side OAuth UI** - Client (ChatGPT/host app) handles OAuth prompts
- **Token Issuance** - We validate tokens, not create them

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ChatGPT / Host Client                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Discover     │───>│ OAuth Flow   │───>│ Attach Bearer Token  │  │
│  │ Auth Server  │    │ (PKCE)       │    │ to MCP Requests      │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
└───────────┬─────────────────────────────────────────┬───────────────┘
            │                                         │
            │ GET /.well-known/                       │ Authorization: Bearer <token>
            │ oauth-protected-resource                │
            ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MCP Server (tool-ui-server)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Protected        │  │ Security Scheme  │  │ Token            │  │
│  │ Resource         │  │ Validator        │  │ Validator        │  │
│  │ Metadata         │  │                  │  │ (JWKS/JWT)       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                      │              │
│  ┌──────────────────────────────────────────────────┼────────────┐ │
│  │                    Tool Handlers                  │            │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ▼            │ │
│  │  │ Tool A     │  │ Tool B     │  │ Tool C     │ Verify       │ │
│  │  │ noauth     │  │ oauth2     │  │ oauth2     │ Token        │ │
│  │  │            │  │ [read]     │  │ [write]    │              │ │
│  │  └────────────┘  └────────────┘  └────────────┘              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ 401 + WWW-Authenticate (on auth failure)
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Authorization Server                            │
│                    (Auth0, Okta, Cognito, etc.)                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ OAuth Metadata   │  │ Token Endpoint   │  │ JWKS Endpoint    │  │
│  │ /.well-known/    │  │ /oauth/token     │  │ /.well-known/    │  │
│  │ openid-config    │  │                  │  │ jwks.json        │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Security Schemes & Tool Configuration

Define security scheme types and extend tool configuration.

### Phase 2: Protected Resource Metadata

Implement RFC 9728 discovery endpoint for resource server metadata.

### Phase 3: Token Validation Infrastructure

Add JWT validation utilities with JWKS support.

### Phase 4: WWW-Authenticate Challenge Helpers

Create utilities for generating spec-compliant auth challenges.

### Phase 5: Integration & Testing

Wire everything together with comprehensive tests.

---

## Phase 1: Security Schemes & Tool Configuration

### Overview

Define TypeScript types and Zod schemas for OAuth security schemes on tools. This allows tools to declare their authentication requirements.

### Changes Required

#### 1. Add Security Scheme Types

**File**: `packages/tool-ui-server/src/types/oauth.ts` (NEW)

```typescript
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
```

#### 2. Add Security Scheme Schemas

**File**: `packages/tool-ui-server/src/schemas/oauth.ts` (NEW)

```typescript
import { z } from "zod";

/**
 * Schema for noauth security scheme
 */
export const NoAuthSecuritySchemeSchema = z.object({
  type: z.literal("noauth"),
});

/**
 * Schema for OAuth2 security scheme
 */
export const OAuth2SecuritySchemeSchema = z.object({
  type: z.literal("oauth2"),
  scopes: z.array(z.string().min(1)).min(1, "OAuth2 scheme requires at least one scope"),
});

/**
 * Union schema for all security schemes
 */
export const SecuritySchemeSchema = z.discriminatedUnion("type", [
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
]);

export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;

/**
 * Schema for OAuth resource server configuration
 */
export const OAuthResourceServerConfigSchema = z.object({
  resource: z.string().url("Resource must be a valid HTTPS URL").startsWith("https://"),
  authorizationServers: z
    .array(z.string().url().startsWith("https://"))
    .min(1, "At least one authorization server required"),
  scopesSupported: z.array(z.string()).optional(),
  resourceDocumentation: z.string().url().optional(),
  bearerMethodsSupported: z
    .array(z.enum(["header", "body", "query"]))
    .default(["header"]),
});

export type OAuthResourceServerConfig = z.infer<typeof OAuthResourceServerConfigSchema>;

/**
 * Schema for protected resource metadata response (RFC 9728)
 */
export const ProtectedResourceMetadataSchema = z.object({
  resource: z.string().url(),
  authorization_servers: z.array(z.string().url()),
  scopes_supported: z.array(z.string()).optional(),
  bearer_methods_supported: z.array(z.string()).optional(),
  resource_documentation: z.string().url().optional(),
});

export type ProtectedResourceMetadata = z.infer<typeof ProtectedResourceMetadataSchema>;
```

#### 3. Extend ToolWithUIConfig

**File**: `packages/tool-ui-server/src/types.ts`

```typescript
// Add import
import type { SecurityScheme } from "./types/oauth";

// Update ToolWithUIConfig interface
export interface ToolWithUIConfig<TArgs extends z.ZodType, TResult> {
  /** Tool name (must be unique within server) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for tool arguments */
  parameters: TArgs;
  /** UI component name to render results */
  component: string;
  /** Execute the tool */
  execute: (args: z.infer<TArgs>, context?: ToolExecutionContext) => Promise<TResult>;
  /** Transform result into component props (optional) */
  transformResult?:
    | ((result: TResult, args: z.infer<TArgs>) => Record<string, unknown>)
    | undefined;
  // Existing ChatGPT Apps SDK parity fields...
  annotations?: ToolAnnotations;
  invocationMessages?: ToolInvocationMessages;
  visibility?: "public" | "private";
  widgetAccessible?: boolean;
  fileParams?: string[];
  
  // NEW: OAuth Security Schemes
  /**
   * Security schemes for this tool.
   * - `[{ type: "noauth" }]` - Tool is publicly accessible
   * - `[{ type: "oauth2", scopes: ["read"] }]` - Requires OAuth with scopes
   * - `[{ type: "noauth" }, { type: "oauth2", scopes: ["read"] }]` - Optional auth
   * 
   * If omitted, inherits from server default (typically noauth).
   */
  securitySchemes?: SecurityScheme[];
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
```

#### 4. Add Tool Schema Validation

**File**: `packages/tool-ui-server/src/schemas/shared.ts`

```typescript
// Add after existing schemas
import { SecuritySchemeSchema } from "./oauth";

// Update ToolMetadataSchema to include security schemes
export const ToolMetadataSchema = z.object({
  annotations: ToolAnnotationsSchema.optional(),
  invocationMessages: ToolInvocationMessagesSchema.optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  widgetAccessible: z.boolean().default(false),
  fileParams: z.array(z.string()).optional(),
  // NEW
  securitySchemes: z.array(SecuritySchemeSchema).optional(),
});
```

#### 5. Export New Types

**File**: `packages/tool-ui-server/src/index.ts`

```typescript
// Add exports
export type {
  SecurityScheme,
  NoAuthSecurityScheme,
  OAuth2SecurityScheme,
  OAuthResourceServerConfig,
  TokenClaims,
  TokenValidationResult,
  AuthenticatedRequest,
  ToolExecutionContext,
} from "./types/oauth";

export {
  SecuritySchemeSchema,
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
  type ProtectedResourceMetadata,
} from "./schemas/oauth";
```

### Success Criteria

- [x] TypeScript compilation passes
- [x] Security scheme schemas validate correctly
- [x] Tools can declare `securitySchemes` in configuration
- [x] New types are exported from package

---

## Phase 2: Protected Resource Metadata

### Overview

Implement the RFC 9728 protected resource metadata endpoint that clients use to discover OAuth configuration.

### Changes Required

#### 1. Create Metadata Generator

**File**: `packages/tool-ui-server/src/oauth/protected-resource-metadata.ts` (NEW)

```typescript
import type { OAuthResourceServerConfig, ProtectedResourceMetadata } from "../types/oauth";

/**
 * Generate RFC 9728 Protected Resource Metadata
 * 
 * This metadata is served at `/.well-known/oauth-protected-resource`
 * and allows OAuth clients to discover how to authenticate with this server.
 * 
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 */
export function generateProtectedResourceMetadata(
  config: OAuthResourceServerConfig
): ProtectedResourceMetadata {
  return {
    resource: config.resource,
    authorization_servers: config.authorizationServers,
    scopes_supported: config.scopesSupported,
    bearer_methods_supported: config.bearerMethodsSupported ?? ["header"],
    resource_documentation: config.resourceDocumentation,
  };
}

/**
 * Validate that a resource URL matches expected format
 */
export function validateResourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract scopes from all tools with OAuth security schemes
 */
export function collectScopesFromTools<T extends { securitySchemes?: Array<{ type: string; scopes?: string[] }> }>(
  tools: T[]
): string[] {
  const scopes = new Set<string>();
  
  for (const tool of tools) {
    if (!tool.securitySchemes) continue;
    
    for (const scheme of tool.securitySchemes) {
      if (scheme.type === "oauth2" && scheme.scopes) {
        for (const scope of scheme.scopes) {
          scopes.add(scope);
        }
      }
    }
  }
  
  return Array.from(scopes).sort();
}
```

#### 2. Create Express/HTTP Handler

**File**: `packages/tool-ui-server/src/oauth/metadata-handler.ts` (NEW)

```typescript
import type { IncomingMessage, ServerResponse } from "http";
import type { OAuthResourceServerConfig } from "../types/oauth";
import { generateProtectedResourceMetadata } from "./protected-resource-metadata";

/**
 * HTTP handler for /.well-known/oauth-protected-resource
 * 
 * Returns RFC 9728 compliant protected resource metadata.
 */
export function createProtectedResourceMetadataHandler(
  config: OAuthResourceServerConfig
) {
  const metadata = generateProtectedResourceMetadata(config);
  const body = JSON.stringify(metadata, null, 2);
  
  return function handleProtectedResourceMetadata(
    _req: IncomingMessage,
    res: ServerResponse
  ): void {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  };
}

/**
 * Path for the protected resource metadata endpoint
 */
export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

/**
 * Check if a request path matches the metadata endpoint
 */
export function isProtectedResourceMetadataRequest(path: string): boolean {
  return path === PROTECTED_RESOURCE_METADATA_PATH;
}
```

#### 3. Integrate with MCP Server

**File**: `packages/tool-ui-server/src/create-tool-ui-server.ts`

```typescript
// Add imports
import type { OAuthResourceServerConfig } from "./types/oauth";
import {
  createProtectedResourceMetadataHandler,
  PROTECTED_RESOURCE_METADATA_PATH,
  isProtectedResourceMetadataRequest,
} from "./oauth/metadata-handler";
import { collectScopesFromTools } from "./oauth/protected-resource-metadata";

// Update ToolUIServerOptions interface
export interface ToolUIServerOptions {
  // ... existing options ...
  
  /**
   * OAuth configuration for this resource server.
   * When provided, enables OAuth authentication support:
   * - Exposes /.well-known/oauth-protected-resource metadata
   * - Enables per-tool security scheme validation
   * - Adds token validation utilities to tool context
   */
  oauth?: OAuthResourceServerConfig;
}

// Update createToolUIServer function
export function createToolUIServer(options: ToolUIServerOptions) {
  const { oauth, ...rest } = options;
  
  // Auto-collect scopes from tools if not specified
  let oauthConfig = oauth;
  if (oauthConfig && !oauthConfig.scopesSupported) {
    oauthConfig = {
      ...oauthConfig,
      scopesSupported: collectScopesFromTools(options.tools),
    };
  }
  
  // Create metadata handler if OAuth is configured
  const metadataHandler = oauthConfig
    ? createProtectedResourceMetadataHandler(oauthConfig)
    : null;
  
  // ... rest of implementation
  
  return {
    // ... existing returns ...
    
    /**
     * Handle OAuth metadata requests
     * Call this before your MCP handler for HTTP transports
     */
    handleOAuthMetadata: metadataHandler,
    
    /**
     * Check if a request is for OAuth metadata
     */
    isOAuthMetadataRequest: isProtectedResourceMetadataRequest,
    
    /**
     * OAuth configuration (if enabled)
     */
    oauthConfig,
  };
}
```

### Success Criteria

- [x] Metadata endpoint returns valid RFC 9728 response
- [x] Scopes are auto-collected from tool security schemes
- [x] CORS headers allow cross-origin requests
- [x] Cache headers are set appropriately

---

## Phase 3: Token Validation Infrastructure

### Overview

Implement JWT validation utilities with JWKS (JSON Web Key Set) support for verifying access tokens issued by authorization servers.

### Changes Required

#### 1. JWKS Client

**File**: `packages/tool-ui-server/src/oauth/jwks-client.ts` (NEW)

```typescript
import type { TokenClaims } from "../types/oauth";

/**
 * JSON Web Key structure
 */
interface JWK {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

/**
 * JWKS response structure
 */
interface JWKS {
  keys: JWK[];
}

/**
 * Cached JWKS entry
 */
interface CachedJWKS {
  keys: Map<string, JWK>;
  fetchedAt: number;
}

/**
 * JWKS Client Options
 */
export interface JWKSClientOptions {
  /** JWKS endpoint URL */
  jwksUri: string;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTtlMs?: number;
  /** Request timeout in milliseconds (default: 10 seconds) */
  timeoutMs?: number;
}

/**
 * JWKS Client for fetching and caching signing keys
 * 
 * Handles key rotation by re-fetching JWKS when an unknown kid is encountered.
 */
export class JWKSClient {
  private readonly jwksUri: string;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private cache: CachedJWKS | null = null;
  private fetchPromise: Promise<JWKS> | null = null;

  constructor(options: JWKSClientOptions) {
    this.jwksUri = options.jwksUri;
    this.cacheTtlMs = options.cacheTtlMs ?? 60 * 60 * 1000; // 1 hour
    this.timeoutMs = options.timeoutMs ?? 10 * 1000; // 10 seconds
  }

  /**
   * Get a signing key by key ID
   */
  async getSigningKey(kid: string): Promise<JWK | null> {
    // Check cache first
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      const key = this.cache.keys.get(kid);
      if (key) return key;
    }

    // Fetch fresh JWKS
    const jwks = await this.fetchJWKS();
    const key = this.cache?.keys.get(kid);
    
    return key ?? null;
  }

  /**
   * Fetch JWKS from the authorization server
   */
  private async fetchJWKS(): Promise<JWKS> {
    // Deduplicate concurrent fetches
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.doFetch();
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async doFetch(): Promise<JWKS> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.jwksUri, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
      }

      const jwks: JWKS = await response.json();
      
      // Update cache
      const keys = new Map<string, JWK>();
      for (const key of jwks.keys) {
        if (key.kid) {
          keys.set(key.kid, key);
        }
      }
      
      this.cache = {
        keys,
        fetchedAt: Date.now(),
      };

      return jwks;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Clear the JWKS cache
   */
  clearCache(): void {
    this.cache = null;
  }
}
```

#### 2. JWT Validator

**File**: `packages/tool-ui-server/src/oauth/token-validator.ts` (NEW)

```typescript
import type { TokenClaims, TokenValidationResult } from "../types/oauth";
import { JWKSClient, type JWKSClientOptions } from "./jwks-client";

/**
 * Token Validator Options
 */
export interface TokenValidatorOptions {
  /** JWKS client options */
  jwks: JWKSClientOptions;
  /** Expected token issuer (iss claim) */
  issuer: string;
  /** Expected audience (aud claim) - typically the resource server URL */
  audience: string;
  /** Clock skew tolerance in seconds (default: 60) */
  clockSkewSeconds?: number;
}

/**
 * JWT Token Validator
 * 
 * Validates access tokens issued by the authorization server.
 * 
 * @example
 * ```typescript
 * const validator = new TokenValidator({
 *   jwks: { jwksUri: "https://auth.example.com/.well-known/jwks.json" },
 *   issuer: "https://auth.example.com",
 *   audience: "https://mcp.example.com",
 * });
 * 
 * const result = await validator.validate(bearerToken);
 * if (result.valid) {
 *   console.log("User:", result.claims.sub);
 * }
 * ```
 */
export class TokenValidator {
  private readonly jwksClient: JWKSClient;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly clockSkewSeconds: number;

  constructor(options: TokenValidatorOptions) {
    this.jwksClient = new JWKSClient(options.jwks);
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.clockSkewSeconds = options.clockSkewSeconds ?? 60;
  }

  /**
   * Validate a JWT access token
   */
  async validate(token: string): Promise<TokenValidationResult> {
    try {
      // Parse JWT structure
      const parts = token.split(".");
      if (parts.length !== 3) {
        return {
          valid: false,
          error: "Invalid token format",
          errorCode: "invalid_token",
        };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Decode header to get kid
      const header = this.decodeBase64Url(headerB64!);
      const headerJson = JSON.parse(header);
      const { alg, kid } = headerJson;

      if (!kid) {
        return {
          valid: false,
          error: "Token missing key ID (kid)",
          errorCode: "invalid_token",
        };
      }

      // Get signing key
      const signingKey = await this.jwksClient.getSigningKey(kid);
      if (!signingKey) {
        return {
          valid: false,
          error: `Unknown signing key: ${kid}`,
          errorCode: "invalid_token",
        };
      }

      // Verify signature
      const isValidSignature = await this.verifySignature(
        `${headerB64}.${payloadB64}`,
        signatureB64!,
        signingKey,
        alg
      );

      if (!isValidSignature) {
        return {
          valid: false,
          error: "Invalid signature",
          errorCode: "invalid_token",
        };
      }

      // Decode and validate claims
      const payload = this.decodeBase64Url(payloadB64!);
      const claims: TokenClaims = JSON.parse(payload);

      // Validate issuer
      if (claims.iss !== this.issuer) {
        return {
          valid: false,
          error: `Invalid issuer: expected ${this.issuer}, got ${claims.iss}`,
          errorCode: "invalid_token",
        };
      }

      // Validate audience
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(this.audience)) {
        return {
          valid: false,
          error: `Invalid audience: expected ${this.audience}`,
          errorCode: "invalid_token",
        };
      }

      // Validate expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp && claims.exp + this.clockSkewSeconds < now) {
        return {
          valid: false,
          error: "Token expired",
          errorCode: "invalid_token",
        };
      }

      // Validate not before
      if (claims.nbf && claims.nbf - this.clockSkewSeconds > now) {
        return {
          valid: false,
          error: "Token not yet valid",
          errorCode: "invalid_token",
        };
      }

      return {
        valid: true,
        claims,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Token validation failed",
        errorCode: "invalid_token",
      };
    }
  }

  /**
   * Check if token has required scopes
   */
  hasScopes(claims: TokenClaims, requiredScopes: string[]): boolean {
    if (requiredScopes.length === 0) return true;

    const tokenScopes = this.parseScopes(claims.scope);
    return requiredScopes.every((scope) => tokenScopes.includes(scope));
  }

  /**
   * Parse scopes from token claims
   */
  private parseScopes(scope: string | string[] | undefined): string[] {
    if (!scope) return [];
    if (Array.isArray(scope)) return scope;
    return scope.split(" ").filter(Boolean);
  }

  /**
   * Decode base64url string
   */
  private decodeBase64Url(str: string): string {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    // Decode
    return atob(base64);
  }

  /**
   * Verify JWT signature using Web Crypto API
   */
  private async verifySignature(
    data: string,
    signature: string,
    jwk: { n?: string; e?: string; x?: string; y?: string; crv?: string; kty: string },
    algorithm: string
  ): Promise<boolean> {
    try {
      // Import the JWK as a CryptoKey
      const cryptoKey = await crypto.subtle.importKey(
        "jwk",
        jwk as JsonWebKey,
        this.getAlgorithm(algorithm, jwk),
        false,
        ["verify"]
      );

      // Decode the signature
      const signatureBytes = this.base64UrlToArrayBuffer(signature);
      const dataBytes = new TextEncoder().encode(data);

      // Verify
      return await crypto.subtle.verify(
        this.getVerifyAlgorithm(algorithm),
        cryptoKey,
        signatureBytes,
        dataBytes
      );
    } catch {
      return false;
    }
  }

  private getAlgorithm(
    alg: string,
    jwk: { crv?: string; kty: string }
  ): AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams {
    switch (alg) {
      case "RS256":
        return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
      case "RS384":
        return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" };
      case "RS512":
        return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" };
      case "ES256":
        return { name: "ECDSA", namedCurve: jwk.crv ?? "P-256" };
      case "ES384":
        return { name: "ECDSA", namedCurve: jwk.crv ?? "P-384" };
      case "ES512":
        return { name: "ECDSA", namedCurve: jwk.crv ?? "P-521" };
      default:
        throw new Error(`Unsupported algorithm: ${alg}`);
    }
  }

  private getVerifyAlgorithm(alg: string): AlgorithmIdentifier | RsaHashedImportParams | EcdsaParams {
    switch (alg) {
      case "RS256":
      case "RS384":
      case "RS512":
        return { name: "RSASSA-PKCS1-v1_5" };
      case "ES256":
        return { name: "ECDSA", hash: "SHA-256" };
      case "ES384":
        return { name: "ECDSA", hash: "SHA-384" };
      case "ES512":
        return { name: "ECDSA", hash: "SHA-512" };
      default:
        throw new Error(`Unsupported algorithm: ${alg}`);
    }
  }

  private base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Create a token validator from OAuth resource server config
 */
export function createTokenValidator(
  resourceConfig: {
    resource: string;
    authorizationServers: string[];
  },
  jwksPath: string = "/.well-known/jwks.json"
): TokenValidator {
  const authServer = resourceConfig.authorizationServers[0];
  if (!authServer) {
    throw new Error("No authorization server configured");
  }

  return new TokenValidator({
    jwks: {
      jwksUri: `${authServer}${jwksPath}`,
    },
    issuer: authServer,
    audience: resourceConfig.resource,
  });
}
```

#### 3. Extract Bearer Token Helper

**File**: `packages/tool-ui-server/src/oauth/extract-token.ts` (NEW)

```typescript
import type { AuthenticatedRequest } from "../types/oauth";

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  
  const parts = authorizationHeader.split(" ");
  if (parts.length !== 2) return null;
  
  const [scheme, token] = parts;
  if (scheme?.toLowerCase() !== "bearer") return null;
  
  return token && token.length > 0 ? token : null;
}

/**
 * Create authenticated request context from headers
 */
export function createAuthenticatedRequest(
  headers: Record<string, string | string[] | undefined>
): AuthenticatedRequest {
  const authHeader = headers["authorization"];
  const authorizationHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const bearerToken = extractBearerToken(authorizationHeader);
  
  return {
    authorizationHeader,
    bearerToken: bearerToken ?? undefined,
    isAuthenticated: false, // Will be set to true after validation
  };
}
```

### Success Criteria

- [x] JWKS client fetches and caches keys correctly
- [x] Token validator verifies RS256/ES256 signatures
- [x] Claims validation catches expired/invalid tokens
- [x] Scope checking works correctly
- [x] Helper functions extract tokens properly

---

## Phase 4: WWW-Authenticate Challenge Helpers

### Overview

Create utilities for generating RFC-compliant WWW-Authenticate challenges that trigger OAuth flows in clients.

### Changes Required

#### 1. WWW-Authenticate Builder

**File**: `packages/tool-ui-server/src/oauth/www-authenticate.ts` (NEW)

```typescript
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

  // Add realm if provided
  if (options.realm) {
    parts.push(`realm="${escapeQuotes(options.realm)}"`);
  }

  // Add error code
  parts.push(`error="${options.error}"`);

  // Add error description
  if (options.errorDescription) {
    parts.push(`error_description="${escapeQuotes(options.errorDescription)}"`);
  }

  // Add scope
  if (options.scope && options.scope.length > 0) {
    parts.push(`scope="${options.scope.join(" ")}"`);
  }

  // Add resource metadata URL (MCP-specific)
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
        errorDescription: description ?? "The access token is invalid or expired",
        resourceMetadataUrl,
      });
    },

    /**
     * Build challenge for insufficient scope
     */
    insufficientScope(requiredScopes: string[], description?: string): string {
      return buildWWWAuthenticate({
        error: "insufficient_scope",
        errorDescription: description ?? "The access token does not have the required scopes",
        scope: requiredScopes,
        resourceMetadataUrl,
      });
    },
  };
}
```

#### 2. MCP Error Result Builder

**File**: `packages/tool-ui-server/src/oauth/mcp-auth-error.ts` (NEW)

```typescript
import type { AuthErrorCode } from "./www-authenticate";

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
  wwwAuthenticateHeader: string
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
  wwwAuthenticateHelper: { insufficientScope: (scopes: string[], desc?: string) => string },
  options: ScopeUpgradeOptions
): MCPAuthErrorResult {
  const { requiredScopes, message } = options;
  
  const defaultMessage = `This action requires additional permissions: ${requiredScopes.join(", ")}`;
  
  return createMCPAuthError(
    message ?? defaultMessage,
    wwwAuthenticateHelper.insufficientScope(requiredScopes)
  );
}
```

### Success Criteria

- [x] WWW-Authenticate headers are RFC 6750 compliant
- [x] MCP auth errors include proper `_meta` structure
- [x] Helper functions generate correct challenge strings
- [x] Integration with resource config works correctly

---

## Phase 5: Integration & Testing

### Overview

Wire all OAuth components together and add comprehensive tests.

### Changes Required

#### ✅ COMPLETED - Create OAuth Module Index

**File**: `packages/tool-ui-server/src/oauth/index.ts` (COMPLETED)

#### ✅ COMPLETED - Add Comprehensive Test Suite

**File**: `packages/tool-ui-server/src/__tests__/oauth.test.ts` (COMPLETED)

```typescript
// Types
export type {
  SecurityScheme,
  NoAuthSecurityScheme,
  OAuth2SecurityScheme,
  OAuthResourceServerConfig,
  TokenClaims,
  TokenValidationResult,
  AuthenticatedRequest,
} from "../types/oauth";

// Schemas
export {
  SecuritySchemeSchema,
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
} from "../schemas/oauth";

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

// Token Validation
export { JWKSClient, type JWKSClientOptions } from "./jwks-client";
export {
  TokenValidator,
  type TokenValidatorOptions,
  createTokenValidator,
} from "./token-validator";

// Token Extraction
export { extractBearerToken, createAuthenticatedRequest } from "./extract-token";

// WWW-Authenticate
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
```

#### 2. Update Main Package Exports

**File**: `packages/tool-ui-server/src/index.ts`

```typescript
// Add OAuth exports
export * from "./oauth";
```

#### 3. Add Unit Tests

**File**: `packages/tool-ui-server/src/oauth/__tests__/security-schemes.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  SecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
} from "../schemas/oauth";

describe("Security Scheme Schemas", () => {
  describe("SecuritySchemeSchema", () => {
    it("accepts noauth scheme", () => {
      const result = SecuritySchemeSchema.safeParse({ type: "noauth" });
      expect(result.success).toBe(true);
    });

    it("accepts oauth2 scheme with scopes", () => {
      const result = SecuritySchemeSchema.safeParse({
        type: "oauth2",
        scopes: ["files:read", "files:write"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects oauth2 without scopes", () => {
      const result = OAuth2SecuritySchemeSchema.safeParse({
        type: "oauth2",
      });
      expect(result.success).toBe(false);
    });

    it("rejects oauth2 with empty scopes", () => {
      const result = OAuth2SecuritySchemeSchema.safeParse({
        type: "oauth2",
        scopes: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown scheme type", () => {
      const result = SecuritySchemeSchema.safeParse({
        type: "apikey",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("OAuthResourceServerConfigSchema", () => {
    it("accepts valid config", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "https://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
        scopesSupported: ["read", "write"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects HTTP resource URL", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "http://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty authorization servers", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "https://mcp.example.com",
        authorizationServers: [],
      });
      expect(result.success).toBe(false);
    });

    it("sets default bearer methods", () => {
      const result = OAuthResourceServerConfigSchema.parse({
        resource: "https://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
      });
      expect(result.bearerMethodsSupported).toEqual(["header"]);
    });
  });
});
```

**File**: `packages/tool-ui-server/src/oauth/__tests__/protected-resource-metadata.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  generateProtectedResourceMetadata,
  collectScopesFromTools,
} from "../protected-resource-metadata";

describe("Protected Resource Metadata", () => {
  it("generates valid RFC 9728 metadata", () => {
    const metadata = generateProtectedResourceMetadata({
      resource: "https://mcp.example.com",
      authorizationServers: ["https://auth.example.com"],
      scopesSupported: ["files:read", "files:write"],
      resourceDocumentation: "https://docs.example.com",
    });

    expect(metadata).toEqual({
      resource: "https://mcp.example.com",
      authorization_servers: ["https://auth.example.com"],
      scopes_supported: ["files:read", "files:write"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://docs.example.com",
    });
  });

  it("collects scopes from tools", () => {
    const tools = [
      { securitySchemes: [{ type: "noauth" }] },
      { securitySchemes: [{ type: "oauth2", scopes: ["read"] }] },
      { securitySchemes: [{ type: "oauth2", scopes: ["write", "read"] }] },
      { name: "no-schemes" }, // No securitySchemes
    ];

    const scopes = collectScopesFromTools(tools);
    expect(scopes).toEqual(["read", "write"]); // Sorted and deduplicated
  });
});
```

**File**: `packages/tool-ui-server/src/oauth/__tests__/www-authenticate.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  buildWWWAuthenticate,
  createWWWAuthenticateHelper,
} from "../www-authenticate";

describe("WWW-Authenticate", () => {
  describe("buildWWWAuthenticate", () => {
    it("builds basic unauthorized challenge", () => {
      const header = buildWWWAuthenticate({
        error: "invalid_request",
        errorDescription: "Authorization required",
      });

      expect(header).toBe(
        'Bearer error="invalid_request", error_description="Authorization required"'
      );
    });

    it("includes scope when provided", () => {
      const header = buildWWWAuthenticate({
        error: "insufficient_scope",
        scope: ["files:read", "files:write"],
      });

      expect(header).toContain('scope="files:read files:write"');
    });

    it("includes resource metadata URL", () => {
      const header = buildWWWAuthenticate({
        error: "invalid_token",
        resourceMetadataUrl: "https://mcp.example.com/.well-known/oauth-protected-resource",
      });

      expect(header).toContain(
        'resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"'
      );
    });

    it("escapes quotes in description", () => {
      const header = buildWWWAuthenticate({
        error: "invalid_token",
        errorDescription: 'Token "abc" is invalid',
      });

      expect(header).toContain('error_description="Token \\"abc\\" is invalid"');
    });
  });

  describe("createWWWAuthenticateHelper", () => {
    const helper = createWWWAuthenticateHelper({
      resource: "https://mcp.example.com",
      authorizationServers: ["https://auth.example.com"],
    });

    it("unauthorized includes resource metadata", () => {
      const header = helper.unauthorized();
      expect(header).toContain("resource_metadata=");
      expect(header).toContain('error="invalid_request"');
    });

    it("invalidToken includes resource metadata", () => {
      const header = helper.invalidToken();
      expect(header).toContain('error="invalid_token"');
    });

    it("insufficientScope includes required scopes", () => {
      const header = helper.insufficientScope(["admin"]);
      expect(header).toContain('error="insufficient_scope"');
      expect(header).toContain('scope="admin"');
    });
  });
});
```

**File**: `packages/tool-ui-server/src/oauth/__tests__/mcp-auth-error.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import { createMCPAuthError, createScopeUpgradeError } from "../mcp-auth-error";

describe("MCP Auth Error", () => {
  describe("createMCPAuthError", () => {
    it("creates valid MCP error structure", () => {
      const error = createMCPAuthError(
        "Please log in",
        'Bearer error="invalid_request"'
      );

      expect(error).toEqual({
        content: [{ type: "text", text: "Please log in" }],
        _meta: {
          "mcp/www_authenticate": ['Bearer error="invalid_request"'],
        },
        isError: true,
      });
    });
  });

  describe("createScopeUpgradeError", () => {
    const mockHelper = {
      insufficientScope: (scopes: string[]) =>
        `Bearer error="insufficient_scope", scope="${scopes.join(" ")}"`,
    };

    it("creates scope upgrade error", () => {
      const error = createScopeUpgradeError(mockHelper, {
        requiredScopes: ["admin", "write"],
      });

      expect(error.content[0]?.text).toContain("admin, write");
      expect(error._meta["mcp/www_authenticate"][0]).toContain("insufficient_scope");
    });

    it("uses custom message", () => {
      const error = createScopeUpgradeError(mockHelper, {
        requiredScopes: ["admin"],
        message: "Admin access required",
      });

      expect(error.content[0]?.text).toBe("Admin access required");
    });
  });
});
```

**File**: `packages/tool-ui-server/src/oauth/__tests__/extract-token.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import { extractBearerToken, createAuthenticatedRequest } from "../extract-token";

describe("Token Extraction", () => {
  describe("extractBearerToken", () => {
    it("extracts token from Bearer header", () => {
      const token = extractBearerToken("Bearer abc123");
      expect(token).toBe("abc123");
    });

    it("returns null for missing header", () => {
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it("returns null for non-Bearer scheme", () => {
      expect(extractBearerToken("Basic abc123")).toBeNull();
    });

    it("returns null for malformed header", () => {
      expect(extractBearerToken("Bearer")).toBeNull();
      expect(extractBearerToken("Bearerabc123")).toBeNull();
    });

    it("is case-insensitive for scheme", () => {
      expect(extractBearerToken("bearer abc123")).toBe("abc123");
      expect(extractBearerToken("BEARER abc123")).toBe("abc123");
    });
  });

  describe("createAuthenticatedRequest", () => {
    it("creates request context with token", () => {
      const req = createAuthenticatedRequest({
        authorization: "Bearer token123",
      });

      expect(req.authorizationHeader).toBe("Bearer token123");
      expect(req.bearerToken).toBe("token123");
      expect(req.isAuthenticated).toBe(false);
    });

    it("handles array headers", () => {
      const req = createAuthenticatedRequest({
        authorization: ["Bearer token123", "Bearer other"],
      });

      expect(req.bearerToken).toBe("token123");
    });

    it("handles missing authorization", () => {
      const req = createAuthenticatedRequest({});

      expect(req.authorizationHeader).toBeUndefined();
      expect(req.bearerToken).toBeUndefined();
      expect(req.isAuthenticated).toBe(false);
    });
  });
});
```

#### 4. Add Integration Test

**File**: `packages/tool-ui-server/src/oauth/__tests__/integration.test.ts` (NEW)

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  createWWWAuthenticateHelper,
  createMCPAuthError,
  generateProtectedResourceMetadata,
  extractBearerToken,
} from "../index";

describe("OAuth Integration", () => {
  it("full flow: metadata -> challenge -> error response", () => {
    // 1. Configure resource server
    const config = {
      resource: "https://mcp.example.com",
      authorizationServers: ["https://auth.example.com"],
      scopesSupported: ["files:read", "files:write"],
    };

    // 2. Generate metadata for discovery
    const metadata = generateProtectedResourceMetadata(config);
    expect(metadata.resource).toBe("https://mcp.example.com");
    expect(metadata.authorization_servers).toContain("https://auth.example.com");

    // 3. Create helper for generating challenges
    const wwwAuth = createWWWAuthenticateHelper(config);

    // 4. Simulate missing token scenario
    const missingTokenChallenge = wwwAuth.unauthorized("Please authenticate");
    expect(missingTokenChallenge).toContain('error="invalid_request"');

    // 5. Create MCP error response
    const mcpError = createMCPAuthError(
      "Authentication required to access this tool",
      missingTokenChallenge
    );
    expect(mcpError.isError).toBe(true);
    expect(mcpError._meta["mcp/www_authenticate"]).toHaveLength(1);

    // 6. Simulate insufficient scope scenario
    const scopeChallenge = wwwAuth.insufficientScope(["files:write"]);
    expect(scopeChallenge).toContain('scope="files:write"');
  });

  it("tool with security schemes flow", () => {
    // Define a tool with OAuth requirement
    const tool = {
      name: "create_document",
      description: "Create a new document",
      securitySchemes: [
        { type: "oauth2" as const, scopes: ["docs:write"] },
      ],
    };

    // Verify security scheme is properly defined
    expect(tool.securitySchemes[0]?.type).toBe("oauth2");
    expect(tool.securitySchemes[0]?.scopes).toContain("docs:write");

    // Simulate request without token
    const token = extractBearerToken(undefined);
    expect(token).toBeNull();

    // Tool should return auth error
    const config = {
      resource: "https://docs.example.com",
      authorizationServers: ["https://auth.example.com"],
    };
    const wwwAuth = createWWWAuthenticateHelper(config);
    const error = createMCPAuthError(
      "Authentication required",
      wwwAuth.unauthorized()
    );

    expect(error.isError).toBe(true);
  });
});
```

### Success Criteria

- [ ] All OAuth tests pass: `npm run test -w @assistant-ui/tool-ui-server`
- [ ] TypeScript compilation passes
- [ ] All exports are accessible from package
- [ ] Integration tests cover full OAuth flow

---

## Testing Strategy

### Unit Tests

| Component | Tests |
|-----------|-------|
| Security Scheme Schemas | noauth, oauth2, validation errors |
| Resource Server Config | URL validation, defaults, required fields |
| Protected Resource Metadata | RFC 9728 compliance, scope collection |
| WWW-Authenticate Builder | RFC 6750 compliance, escaping, all error codes |
| MCP Auth Error | Structure validation, scope upgrade |
| Token Extraction | Bearer parsing, edge cases |
| JWKS Client | Caching, key lookup, error handling |
| Token Validator | Signature verification, claims validation |

### Integration Tests

| Flow | Description |
|------|-------------|
| Discovery | Client fetches metadata, discovers auth server |
| Challenge | Tool returns proper 401 with WWW-Authenticate |
| Validation | Valid token passes, invalid fails appropriately |
| Scope Check | Missing scopes trigger step-up auth |

### Manual Testing Steps

1. Configure OAuth with Auth0/Okta test tenant
2. Start MCP server with OAuth config
3. Verify `/.well-known/oauth-protected-resource` returns metadata
4. Call tool without token, verify 401 challenge
5. Complete OAuth flow, call tool with token
6. Call tool with insufficient scopes, verify scope challenge

---

## Performance Considerations

- **JWKS Caching**: Keys cached for 1 hour by default, re-fetched on unknown kid
- **Token Validation**: No network call if signature/claims validation fails
- **Metadata Response**: Pre-computed and cached, served with Cache-Control
- **Concurrent Fetches**: JWKS deduplicates concurrent requests

---

## Security Considerations

- **HTTPS Only**: Resource URLs must be HTTPS
- **Signature Verification**: All tokens verified against JWKS
- **Audience Validation**: Tokens must be issued for this resource server
- **Clock Skew**: 60-second tolerance for exp/nbf claims
- **No Token Storage**: Stateless validation, tokens not persisted
- **Scope Enforcement**: Tools must verify required scopes

---

## Migration Notes

- **Non-Breaking**: OAuth is opt-in via `oauth` config option
- **Gradual Adoption**: Tools without `securitySchemes` continue working
- **Existing Auth**: Compatible with existing Bearer token patterns
- **No Dependencies**: Uses Web Crypto API (built-in)

---

## References

- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [ChatGPT Apps SDK Authentication](https://developers.openai.com/apps-sdk/build/auth/)
- [RFC 9728 - OAuth Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [RFC 6750 - Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 8414 - OAuth Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [Stytch MCP Auth Guide](https://stytch.com/blog/guide-to-authentication-for-the-openai-apps-sdk/)

---

## Appendix: Example Usage

### Server Configuration

```typescript
import { createToolUIServer } from "@assistant-ui/tool-ui-server";

const server = createToolUIServer({
  tools: [
    {
      name: "get_documents",
      description: "List user documents",
      parameters: z.object({}),
      component: "document-list",
      execute: async (_, ctx) => {
        // Anonymous access allowed
        return { documents: [] };
      },
      securitySchemes: [{ type: "noauth" }],
    },
    {
      name: "create_document",
      description: "Create a new document",
      parameters: z.object({ title: z.string() }),
      component: "document-editor",
      execute: async (args, ctx) => {
        if (!ctx?.auth?.isAuthenticated) {
          // Return auth error (handled by framework)
          throw new Error("Authentication required");
        }
        return { id: "doc_123", title: args.title };
      },
      securitySchemes: [{ type: "oauth2", scopes: ["docs:write"] }],
    },
  ],
  oauth: {
    resource: "https://mcp.yourapp.com",
    authorizationServers: ["https://auth.yourapp.com"],
    scopesSupported: ["docs:read", "docs:write"],
  },
});
```

### Tool Handler with Auth

```typescript
import {
  createWWWAuthenticateHelper,
  createMCPAuthError,
  type ToolExecutionContext,
} from "@assistant-ui/tool-ui-server";

const wwwAuth = createWWWAuthenticateHelper(oauthConfig);

async function executeCreateDocument(
  args: { title: string },
  ctx?: ToolExecutionContext
) {
  // Check authentication
  if (!ctx?.auth?.isAuthenticated) {
    return createMCPAuthError(
      "Please sign in to create documents",
      wwwAuth.unauthorized()
    );
  }

  // Check scopes
  const validator = createTokenValidator(oauthConfig);
  if (!validator.hasScopes(ctx.auth.claims!, ["docs:write"])) {
    return createMCPAuthError(
      "You need write permission to create documents",
      wwwAuth.insufficientScope(["docs:write"])
    );
  }

  // Execute tool
  return { id: "doc_123", title: args.title };
}
```
