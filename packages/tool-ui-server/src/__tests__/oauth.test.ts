import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
} from "../oauth";
import {
  generateProtectedResourceMetadata,
  collectScopesFromTools,
  validateResourceUrl,
} from "../oauth/protected-resource-metadata";
import { JWKSClient } from "../oauth/jwks-client";
import { TokenValidator } from "../oauth/token-validator";
import {
  extractBearerToken,
  createAuthenticatedRequest,
} from "../oauth/extract-token";
import {
  buildWWWAuthenticate,
  createWWWAuthenticateHelper,
} from "../oauth/www-authenticate";
import { createMCPAuthError } from "../oauth/mcp-auth-error";

describe("OAuth Schema Validation", () => {
  describe("SecuritySchemeSchema", () => {
    it("should accept noauth scheme", () => {
      const result = SecuritySchemeSchema.safeParse({ type: "noauth" });
      expect(result.success).toBe(true);
    });

    it("should accept oauth2 scheme with scopes", () => {
      const result = SecuritySchemeSchema.safeParse({
        type: "oauth2",
        scopes: ["read", "write"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject oauth2 scheme without scopes", () => {
      const result = SecuritySchemeSchema.safeParse({
        type: "oauth2",
        scopes: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid scheme type", () => {
      const result = SecuritySchemeSchema.safeParse({
        type: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("OAuthResourceServerConfigSchema", () => {
    it("should accept valid config", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "https://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
        scopesSupported: ["read", "write"],
      });
      expect(result.success).toBe(true);
    });

    it("should require HTTPS URLs", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "http://mcp.example.com",
        authorizationServers: ["http://auth.example.com"],
      });
      expect(result.success).toBe(false);
    });

    it("should require at least one authorization server", () => {
      const result = OAuthResourceServerConfigSchema.safeParse({
        resource: "https://mcp.example.com",
        authorizationServers: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ProtectedResourceMetadataSchema", () => {
    it("should accept valid metadata", () => {
      const result = ProtectedResourceMetadataSchema.safeParse({
        resource: "https://mcp.example.com",
        authorization_servers: ["https://auth.example.com"],
        scopes_supported: ["read", "write"],
        bearer_methods_supported: ["header"],
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Protected Resource Metadata", () => {
  describe("generateProtectedResourceMetadata", () => {
    it("should generate RFC 9728 compliant metadata", () => {
      const config = {
        resource: "https://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
        scopesSupported: ["read", "write"],
        bearerMethodsSupported: ["header" as const],
      };

      const metadata = generateProtectedResourceMetadata(config);

      expect(metadata).toEqual({
        resource: "https://mcp.example.com",
        authorization_servers: ["https://auth.example.com"],
        scopes_supported: ["read", "write"],
        bearer_methods_supported: ["header"],
        resource_documentation: undefined,
      });
    });

    it("should handle missing optional fields", () => {
      const config = {
        resource: "https://mcp.example.com",
        authorizationServers: ["https://auth.example.com"],
      };

      const metadata = generateProtectedResourceMetadata(config);

      expect(metadata).toEqual({
        resource: "https://mcp.example.com",
        authorization_servers: ["https://auth.example.com"],
        scopes_supported: undefined,
        bearer_methods_supported: ["header"],
        resource_documentation: undefined,
      });
    });
  });

  describe("collectScopesFromTools", () => {
    it("should collect unique scopes from OAuth tools", () => {
      const tools = [
        {
          securitySchemes: [
            { type: "oauth2", scopes: ["read"] },
            { type: "noauth" },
          ],
        },
        {
          securitySchemes: [{ type: "oauth2", scopes: ["write", "read"] }],
        },
        {
          securitySchemes: [{ type: "noauth" }],
        },
      ];

      const scopes = collectScopesFromTools(tools);

      expect(scopes).toEqual(["read", "write"]);
    });

    it("should handle tools without security schemes", () => {
      const tools = [{}, { securitySchemes: [] }];

      const scopes = collectScopesFromTools(tools);

      expect(scopes).toEqual([]);
    });
  });

  describe("validateResourceUrl", () => {
    it("should accept valid HTTPS URLs", () => {
      expect(validateResourceUrl("https://example.com")).toBe(true);
      expect(validateResourceUrl("https://mcp.example.com/api")).toBe(true);
    });

    it("should reject HTTP URLs", () => {
      expect(validateResourceUrl("http://example.com")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(validateResourceUrl("not-a-url")).toBe(false);
      expect(validateResourceUrl("ftp://example.com")).toBe(false);
    });
  });
});

describe("Token Extraction", () => {
  describe("extractBearerToken", () => {
    it("should extract token from Bearer header", () => {
      const result = extractBearerToken("Bearer abc123");
      expect(result).toBe("abc123");
    });

    it("should handle case-insensitive scheme", () => {
      const result = extractBearerToken("bearer abc123");
      expect(result).toBe("abc123");
    });

    it("should reject invalid schemes", () => {
      const result = extractBearerToken("Basic abc123");
      expect(result).toBe(null);
    });

    it("should reject malformed headers", () => {
      expect(extractBearerToken("Bearer")).toBe(null);
      expect(extractBearerToken("Bearer ")).toBe(null);
      expect(extractBearerToken("Bearer")).toBe(null);
      expect(extractBearerToken(undefined)).toBe(null);
    });

    it("should reject headers with too many parts", () => {
      const result = extractBearerToken("Bearer abc123 def456");
      expect(result).toBe(null);
    });
  });

  describe("createAuthenticatedRequest", () => {
    it("should create authenticated request from headers", () => {
      const headers = {
        authorization: "Bearer abc123",
        "content-type": "application/json",
      };

      const result = createAuthenticatedRequest(headers);

      expect(result).toEqual({
        authorizationHeader: "Bearer abc123",
        bearerToken: "abc123",
        isAuthenticated: false,
      });
    });

    it("should handle array headers", () => {
      const headers = {
        authorization: ["Bearer abc123", "Bearer def456"],
      };

      const result = createAuthenticatedRequest(headers);

      expect(result).toEqual({
        authorizationHeader: "Bearer abc123",
        bearerToken: "abc123",
        isAuthenticated: false,
      });
    });

    it("should handle missing authorization", () => {
      const headers = {};

      const result = createAuthenticatedRequest(headers);

      expect(result).toEqual({
        authorizationHeader: undefined,
        bearerToken: undefined,
        isAuthenticated: false,
      });
    });
  });
});

describe("WWW-Authenticate Helpers", () => {
  describe("buildWWWAuthenticate", () => {
    it("should build basic challenge", () => {
      const result = buildWWWAuthenticate({
        error: "invalid_token",
      });

      expect(result).toBe('Bearer error="invalid_token"');
    });

    it("should include description", () => {
      const result = buildWWWAuthenticate({
        error: "invalid_token",
        errorDescription: "Token expired",
      });

      expect(result).toBe(
        'Bearer error="invalid_token", error_description="Token expired"',
      );
    });

    it("should include scopes", () => {
      const result = buildWWWAuthenticate({
        error: "insufficient_scope",
        scope: ["read", "write"],
      });

      expect(result).toBe(
        'Bearer error="insufficient_scope", scope="read write"',
      );
    });

    it("should include resource metadata URL", () => {
      const result = buildWWWAuthenticate({
        error: "invalid_request",
        resourceMetadataUrl:
          "https://mcp.example.com/.well-known/oauth-protected-resource",
      });

      expect(result).toBe(
        'Bearer error="invalid_request", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      );
    });

    it("should escape quotes in values", () => {
      const result = buildWWWAuthenticate({
        error: "invalid_token",
        errorDescription: 'Error with "quotes"',
      });

      expect(result).toBe(
        'Bearer error="invalid_token", error_description="Error with \\"quotes\\""',
      );
    });

    it("should include all fields", () => {
      const result = buildWWWAuthenticate({
        error: "insufficient_scope",
        errorDescription: "More permissions needed",
        scope: ["read", "write"],
        resourceMetadataUrl:
          "https://mcp.example.com/.well-known/oauth-protected-resource",
        realm: "example.com",
      });

      expect(result).toBe(
        'Bearer realm="example.com", error="insufficient_scope", error_description="More permissions needed", scope="read write", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      );
    });
  });

  describe("createWWWAuthenticateHelper", () => {
    const config = {
      resource: "https://mcp.example.com",
      authorizationServers: ["https://auth.example.com"],
    };

    it("should create unauthorized challenge", () => {
      const helper = createWWWAuthenticateHelper(config);
      const result = helper.unauthorized();

      expect(result).toBe(
        'Bearer error="invalid_request", error_description="Authorization required", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      );
    });

    it("should create invalid token challenge", () => {
      const helper = createWWWAuthenticateHelper(config);
      const result = helper.invalidToken("Token expired");

      expect(result).toBe(
        'Bearer error="invalid_token", error_description="Token expired", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      );
    });

    it("should create insufficient scope challenge", () => {
      const helper = createWWWAuthenticateHelper(config);
      const result = helper.insufficientScope(["read", "write"]);

      expect(result).toBe(
        'Bearer error="insufficient_scope", error_description="The access token does not have the required scopes", scope="read write", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      );
    });
  });
});

describe("MCP Auth Errors", () => {
  describe("createMCPAuthError", () => {
    it("should create MCP error with WWW-Authenticate header", () => {
      const result = createMCPAuthError(
        "Authentication required",
        'Bearer error="invalid_request"',
      );

      expect(result).toEqual({
        content: [{ type: "text", text: "Authentication required" }],
        _meta: {
          "mcp/www_authenticate": ['Bearer error="invalid_request"'],
        },
        isError: true,
      });
    });
  });
});

describe("JWKS Client", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("should fetch and cache JWKS", async () => {
    const mockJWKS = {
      keys: [
        { kty: "RSA", kid: "key1", use: "sig" },
        { kty: "RSA", kid: "key2", use: "sig" },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJWKS,
    });

    const client = new JWKSClient({
      jwksUri: "https://auth.example.com/.well-known/jwks.json",
    });

    const key1 = await client.getSigningKey("key1");
    const key2 = await client.getSigningKey("key2");

    expect(key1).toEqual({ kty: "RSA", kid: "key1", use: "sig" });
    expect(key2).toEqual({ kty: "RSA", kid: "key2", use: "sig" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const client = new JWKSClient({
      jwksUri: "https://auth.example.com/.well-known/jwks.json",
    });

    // Should handle fetch errors gracefully and return null
    const key = await client.getSigningKey("key1");
    expect(key).toBe(null);
  });

  it("should return null for unknown key ID", async () => {
    const mockJWKS = {
      keys: [{ kty: "RSA", kid: "key1", use: "sig" }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJWKS,
    });

    const client = new JWKSClient({
      jwksUri: "https://auth.example.com/.well-known/jwks.json",
    });

    const key = await client.getSigningKey("unknown");
    expect(key).toBe(null);
  });
});

describe("Token Validator", () => {
  it("should validate mock tokens", async () => {
    // Create a validator with mock configuration
    const validator = new TokenValidator({
      jwks: { jwksUri: "https://auth.example.com/.well-known/jwks.json" },
      issuer: "https://auth.example.com",
      audience: "https://mcp.example.com",
    });

    // Test with invalid format
    const result1 = await validator.validate("invalid-token");
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe("Invalid token format");

    // Test with empty token
    const result2 = await validator.validate("");
    expect(result2.valid).toBe(false);
  });
});
