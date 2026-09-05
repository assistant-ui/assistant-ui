import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssistantCloudAnonymousAuthStrategy,
  AssistantCloudJWTAuthStrategy,
  readAnonymousRefreshToken,
} from "../AssistantCloudAuthStrategy";
import { CloudResponseError } from "../cloudResponse";

const baseUrl = "https://test.example.com";
const accessToken = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.sig`;
const refreshToken = {
  token: "r1",
  expires_at: "2099-01-01",
};
const refreshTokenKey = `aui:refresh_token:${baseUrl}`;

let originalLocalStorageDescriptor: PropertyDescriptor | undefined;

const installLocalStorage = (storage: Storage): void => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
};

const mockAnonymousTokenFetch = (nextRefreshToken = refreshToken) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken,
      refresh_token: nextRefreshToken,
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("AssistantCloudAnonymousAuthStrategy", () => {
  beforeEach(() => {
    originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        "localStorage",
        originalLocalStorageDescriptor,
      );
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  it("reads the stored anonymous refresh token", () => {
    const values = new Map([[refreshTokenKey, JSON.stringify(refreshToken)]]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);

    expect(readAnonymousRefreshToken(baseUrl)).toBe(refreshToken.token);
  });

  it("reads the token stored for a base url given with a trailing slash", () => {
    installLocalStorage({
      getItem: (key) =>
        key === refreshTokenKey ? JSON.stringify(refreshToken) : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage);

    expect(readAnonymousRefreshToken(`${baseUrl}/`)).toBe(refreshToken.token);
  });

  it("returns null when no anonymous refresh token is stored", () => {
    installLocalStorage({
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage);

    expect(readAnonymousRefreshToken(baseUrl)).toBeNull();
  });

  it.each([30_000, 0, -1])(
    "returns null when the stored anonymous refresh token expires in %i ms",
    (expiresIn) => {
      vi.useFakeTimers();
      const now = Date.UTC(2026, 8, 4, 12, 0, 0);
      vi.setSystemTime(now);
      const values = new Map([
        [
          refreshTokenKey,
          JSON.stringify({
            token: refreshToken.token,
            expires_at: new Date(now + expiresIn).toISOString(),
          }),
        ],
      ]);
      installLocalStorage({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      } as Storage);

      expect(readAnonymousRefreshToken(baseUrl)).toBeNull();
    },
  );

  it.each([
    "2099-01-01",
    "2099-01-01T00:00:00Z",
    "2099-01-01T00:00:00+0000",
    "2099-01-01T00:00:00",
    "2099-01-01 00:00:00+00",
  ])("persists refresh tokens with expiry %s", async (expiresAt) => {
    const nextRefreshToken = { ...refreshToken, expires_at: expiresAt };
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const fetchMock = mockAnonymousTokenFetch(nextRefreshToken);

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(nextRefreshToken));
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
  });

  it("deduplicates concurrent anonymous token requests", async () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    const fetchMock = mockAnonymousTokenFetch();
    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(
      Promise.all([
        strategy.getAuthHeaders(),
        strategy.getAuthHeaders(),
        strategy.getAuthHeaders(),
      ]),
    ).resolves.toEqual([
      { Authorization: `Bearer ${accessToken}` },
      { Authorization: `Bearer ${accessToken}` },
      { Authorization: `Bearer ${accessToken}` },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates anonymous token requests across strategy instances", async () => {
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const fetchMock = mockAnonymousTokenFetch();
    const first = new AssistantCloudAnonymousAuthStrategy(baseUrl);
    const second = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(
      Promise.all([first.getAuthHeaders(), second.getAuthHeaders()]),
    ).resolves.toEqual([
      { Authorization: `Bearer ${accessToken}` },
      { Authorization: `Bearer ${accessToken}` },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
  });

  it("coordinates anonymous token requests across realms", async () => {
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    let lockTail: Promise<unknown> = Promise.resolve();
    const lockRequest = vi.fn(
      (_name: string, callback: () => Promise<string | null>) => {
        const request = lockTail.then(callback);
        lockTail = request.then(
          () => undefined,
          () => undefined,
        );
        return request;
      },
    );
    vi.stubGlobal("navigator", { locks: { request: lockRequest } });
    const rotatedRefreshToken = { token: "r2", expires_at: "2099-01-01" };
    const response = (refreshTokenValue: typeof refreshToken) => ({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: accessToken,
        refresh_token: refreshTokenValue,
      }),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(refreshToken))
      .mockResolvedValueOnce(response(rotatedRefreshToken));
    vi.stubGlobal("fetch", fetchMock);

    const first = new AssistantCloudAnonymousAuthStrategy(baseUrl);
    vi.resetModules();
    const { AssistantCloudAnonymousAuthStrategy: Second } =
      await import("../AssistantCloudAuthStrategy");

    await expect(
      Promise.all([
        first.getAuthHeaders(),
        new Second(baseUrl).getAuthHeaders(),
      ]),
    ).resolves.toEqual([
      { Authorization: `Bearer ${accessToken}` },
      { Authorization: `Bearer ${accessToken}` },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}/v1/auth/tokens/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken.token }),
        signal: expect.any(AbortSignal),
      },
    );
    expect(lockRequest).toHaveBeenCalledTimes(2);
    expect(values.get(refreshTokenKey)).toBe(
      JSON.stringify(rotatedRefreshToken),
    );
  });

  it("retries shared anonymous token requests after a failure", async () => {
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const failure = new Error("authentication unavailable");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const first = new AssistantCloudAnonymousAuthStrategy(baseUrl);
    const second = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await Promise.all([
      expect(first.getAuthHeaders()).rejects.toBe(failure),
      expect(second.getAuthHeaders()).rejects.toBe(failure),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(
      new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders(),
    ).resolves.toEqual({ Authorization: `Bearer ${accessToken}` });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts timed out shared anonymous token requests before retrying", async () => {
    vi.useFakeTimers();
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: () =>
            new Promise<never>((_resolve, reject) => {
              requestSignal = init?.signal;
              requestSignal?.addEventListener(
                "abort",
                () => reject(requestSignal?.reason),
                { once: true },
              );
            }),
        } as Response),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const first = new AssistantCloudAnonymousAuthStrategy(baseUrl);
    const second = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    const firstRequest = expect(first.getAuthHeaders()).rejects.toThrow(
      "Assistant Cloud anonymous token request timed out after 30000ms",
    );
    const secondRequest = expect(second.getAuthHeaders()).rejects.toThrow(
      "Assistant Cloud anonymous token request timed out after 30000ms",
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    await vi.advanceTimersByTimeAsync(30_000);
    await Promise.all([firstRequest, secondRequest]);
    expect(requestSignal?.aborted).toBe(true);
    expect(values.has(refreshTokenKey)).toBe(false);

    await expect(
      new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders(),
    ).resolves.toEqual({ Authorization: `Bearer ${accessToken}` });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts timed out refresh requests without replacing the identity", async () => {
    vi.useFakeTimers();
    const values = new Map([[refreshTokenKey, JSON.stringify(refreshToken)]]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    let requestSignal: AbortSignal | null | undefined;
    const rotatedRefreshToken = { token: "r2", expires_at: "2099-02-01" };
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            requestSignal = init?.signal;
            requestSignal?.addEventListener(
              "abort",
              () => reject(requestSignal?.reason),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: rotatedRefreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    const request = expect(strategy.getAuthHeaders()).rejects.toThrow(
      "Assistant Cloud refresh token request timed out after 30000ms",
    );
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    await vi.advanceTimersByTimeAsync(30_000);
    await request;
    expect(requestSignal?.aborted).toBe(true);
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(values.get(refreshTokenKey)).toBe(
      JSON.stringify(rotatedRefreshToken),
    );
  });

  it("keeps anonymous token requests independent without localStorage", async () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    const lockRequest = vi.fn();
    vi.stubGlobal("navigator", { locks: { request: lockRequest } });
    const fetchMock = mockAnonymousTokenFetch();
    const first = new AssistantCloudAnonymousAuthStrategy(baseUrl);
    const second = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(
      Promise.all([first.getAuthHeaders(), second.getAuthHeaders()]),
    ).resolves.toEqual([
      { Authorization: `Bearer ${accessToken}` },
      { Authorization: `Bearer ${accessToken}` },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lockRequest).not.toHaveBeenCalled();
  });

  it("scopes anonymous refresh tokens by backend", async () => {
    const secondBaseUrl = "https://other.example.com";
    const values = new Map<string, string>();
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const secondRefreshToken = {
      token: "r2",
      expires_at: "2099-01-01",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: secondRefreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders(),
      new AssistantCloudAnonymousAuthStrategy(secondBaseUrl).getAuthHeaders(),
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${secondBaseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
    expect(values.get(`aui:refresh_token:${secondBaseUrl}`)).toBe(
      JSON.stringify(secondRefreshToken),
    );
  });

  it("migrates the legacy refresh token to the first backend", async () => {
    const secondBaseUrl = "https://other.example.com";
    const secondRefreshToken = {
      token: "r2",
      expires_at: "2099-01-01",
    };
    const values = new Map([
      ["aui:refresh_token", JSON.stringify(refreshToken)],
    ]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: accessToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: secondRefreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders();
    await new AssistantCloudAnonymousAuthStrategy(
      secondBaseUrl,
    ).getAuthHeaders();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/v1/auth/tokens/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken.token }),
        signal: expect.any(AbortSignal),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${secondBaseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
    expect(values.get(`aui:refresh_token:${secondBaseUrl}`)).toBe(
      JSON.stringify(secondRefreshToken),
    );
    expect(values.has("aui:refresh_token")).toBe(false);
  });

  it("retires the legacy refresh token when a scoped token exists", async () => {
    const secondBaseUrl = "https://other.example.com";
    const scopedRefreshToken = {
      token: "scoped-r1",
      expires_at: "2099-01-01",
    };
    const secondRefreshToken = {
      token: "r2",
      expires_at: "2099-01-01",
    };
    const values = new Map([
      ["aui:refresh_token", JSON.stringify(refreshToken)],
      [refreshTokenKey, JSON.stringify(scopedRefreshToken)],
    ]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: accessToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: secondRefreshToken,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders();
    await new AssistantCloudAnonymousAuthStrategy(
      secondBaseUrl,
    ).getAuthHeaders();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/v1/auth/tokens/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: scopedRefreshToken.token }),
        signal: expect.any(AbortSignal),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${secondBaseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST", signal: expect.any(AbortSignal) },
    );
    expect(values.has("aui:refresh_token")).toBe(false);
    expect(values.get(`aui:refresh_token:${secondBaseUrl}`)).toBe(
      JSON.stringify(secondRefreshToken),
    );
  });

  it("returns an anonymous access token without localStorage", async () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    mockAnonymousTokenFetch();

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
  });

  it("returns an anonymous access token when localStorage access is blocked", async () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    mockAnonymousTokenFetch();

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
  });

  it("returns an anonymous access token when storage methods throw", async () => {
    const getItem = vi
      .fn<(key: string) => string | null>()
      .mockReturnValueOnce(
        JSON.stringify({ token: "expired", expires_at: "2022-01-01" }),
      )
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
    const setItem = vi.fn(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const removeItem = vi.fn(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    installLocalStorage({ getItem, setItem, removeItem } as Storage);
    mockAnonymousTokenFetch();

    await expect(
      new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders(),
    ).resolves.toEqual({ Authorization: `Bearer ${accessToken}` });
    await expect(
      new AssistantCloudAnonymousAuthStrategy(baseUrl).getAuthHeaders(),
    ).resolves.toEqual({ Authorization: `Bearer ${accessToken}` });
    expect(getItem).toHaveBeenCalledTimes(2);
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(removeItem).toHaveBeenCalledTimes(2);
  });

  it("treats corrupted refresh token JSON as absent", async () => {
    const values = new Map([["aui:refresh_token", "not-json{"]]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    mockAnonymousTokenFetch();

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
    expect(values.has("aui:refresh_token")).toBe(false);
  });

  it("rejects malformed anonymous token responses without persisting them", async () => {
    const setItem = vi.fn();
    installLocalStorage({
      getItem: () => null,
      setItem,
      removeItem: vi.fn(),
    } as unknown as Storage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: "not-a-refresh-token",
        }),
      }),
    );

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "anonymous auth token response.refresh_token": expected an object',
      ),
    );
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects empty refresh token expiry without persisting it", async () => {
    const setItem = vi.fn();
    installLocalStorage({
      getItem: () => null,
      setItem,
      removeItem: vi.fn(),
    } as unknown as Storage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: accessToken,
          refresh_token: {
            token: "r2",
            expires_at: "",
          },
        }),
      }),
    );

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "anonymous auth token response.refresh_token.expires_at": expected a non-empty string',
      ),
    );
    expect(setItem).not.toHaveBeenCalled();
  });

  it("contextualizes malformed refresh token responses", async () => {
    installLocalStorage({
      getItem: () => JSON.stringify(refreshToken),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 123 }),
      }),
    );

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "refresh auth token response.access_token": expected a string',
      ),
    );
  });

  it("accepts valid refresh responses without a rotated refresh token", async () => {
    const setItem = vi.fn();
    installLocalStorage({
      getItem: () => JSON.stringify(refreshToken),
      setItem,
      removeItem: vi.fn(),
    } as unknown as Storage);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: accessToken,
        refresh_token: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/auth/tokens/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken.token }),
        signal: expect.any(AbortSignal),
      },
    );
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])(
    "preserves the anonymous identity after transient status %i",
    async (status) => {
      const values = new Map([[refreshTokenKey, JSON.stringify(refreshToken)]]);
      installLocalStorage({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      } as Storage);
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status });
      vi.stubGlobal("fetch", fetchMock);

      const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

      await expect(strategy.getAuthHeaders()).rejects.toThrow(
        `Assistant Cloud token refresh failed with status ${status}`,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
    },
  );

  it.each([401, 403])(
    "replaces an anonymous identity after refresh is rejected with %i",
    async (status) => {
      const replacementRefreshToken = {
        token: "r2",
        expires_at: "2099-02-01",
      };
      const values = new Map([[refreshTokenKey, JSON.stringify(refreshToken)]]);
      installLocalStorage({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      } as Storage);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: accessToken,
            refresh_token: replacementRefreshToken,
          }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

      await expect(strategy.getAuthHeaders()).resolves.toEqual({
        Authorization: `Bearer ${accessToken}`,
      });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/v1/auth/tokens/anonymous`,
        { method: "POST", signal: expect.any(AbortSignal) },
      );
      expect(values.get(refreshTokenKey)).toBe(
        JSON.stringify(replacementRefreshToken),
      );
    },
  );

  it("preserves a rejected refresh token until its replacement succeeds", async () => {
    const values = new Map([[refreshTokenKey, JSON.stringify(refreshToken)]]);
    installLocalStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    } as Storage);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: false, status: 503 }),
    );

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toBe(false);
    expect(values.get(refreshTokenKey)).toBe(JSON.stringify(refreshToken));
  });

  it("contextualizes invalid JSON token responses", async () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      }),
    );

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "anonymous auth token response": expected valid JSON',
      ),
    );
  });
});

describe("AssistantCloudJWTAuthStrategy", () => {
  it("retries token acquisition after a failed request", async () => {
    const authToken = vi
      .fn<() => Promise<string | null>>()
      .mockRejectedValueOnce(new Error("authentication unavailable"))
      .mockResolvedValueOnce(accessToken);
    const strategy = new AssistantCloudJWTAuthStrategy(authToken);

    await expect(strategy.getAuthHeaders()).rejects.toThrow(
      "authentication unavailable",
    );
    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(authToken).toHaveBeenCalledTimes(2);
  });
});
