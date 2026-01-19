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
        alg,
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
        error:
          error instanceof Error ? error.message : "Token validation failed",
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
    const binaryString = atob(base64);
    return new TextDecoder("utf-8").decode(
      Uint8Array.from(binaryString, (c) => c.charCodeAt(0)),
    );
  }

  /**
   * Verify JWT signature using Web Crypto API
   */
  private async verifySignature(
    data: string,
    signature: string,
    jwk: {
      n?: string;
      e?: string;
      x?: string;
      y?: string;
      crv?: string;
      kty: string;
    },
    algorithm: string,
  ): Promise<boolean> {
    try {
      // Import the JWK as a CryptoKey
      const cryptoKey = await crypto.subtle.importKey(
        "jwk",
        jwk as JsonWebKey,
        this.getAlgorithm(algorithm, jwk),
        false,
        ["verify"],
      );

      // Decode the signature
      const signatureBytes = this.base64UrlToArrayBuffer(signature);
      const dataBytes = new TextEncoder().encode(data);

      // Verify
      return await crypto.subtle.verify(
        this.getVerifyAlgorithm(algorithm),
        cryptoKey,
        signatureBytes,
        dataBytes,
      );
    } catch {
      return false;
    }
  }

  private getAlgorithm(
    alg: string,
    jwk: { crv?: string; kty: string },
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

  private getVerifyAlgorithm(
    alg: string,
  ): AlgorithmIdentifier | RsaHashedImportParams | EcdsaParams {
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
  jwksPath: string = "/.well-known/jwks.json",
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
