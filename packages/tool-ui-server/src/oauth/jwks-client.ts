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
    this.cacheTtlMs = options.cacheTtlMs ?? 60 * 60 * 1000;
    this.timeoutMs = options.timeoutMs ?? 10 * 1000;
  }

  /**
   * Get a signing key by key ID
   */
  async getSigningKey(kid: string): Promise<JWK | null> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      const key = this.cache.keys.get(kid);
      if (key) return key;
    }

    try {
      await this.fetchJWKS();
      const key = this.cache?.keys.get(kid);

      return key ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch JWKS from the authorization server
   */
  private async fetchJWKS(): Promise<JWKS> {
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
        throw new Error(
          `JWKS fetch failed: ${response.status} ${response.statusText}`,
        );
      }

      const jwks: JWKS = await response.json();

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
