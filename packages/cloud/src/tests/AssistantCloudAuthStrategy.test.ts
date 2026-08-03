import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssistantCloudAnonymousAuthStrategy,
  AssistantCloudJWTAuthStrategy,
} from "../AssistantCloudAuthStrategy";
import { CloudResponseError } from "../cloudResponse";

const baseUrl = "https://test.example.com";
const accessToken = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.sig`;
const refreshToken = {
  token: "r1",
  expires_at: "2099-01-01",
};

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
    expect(values.get("aui:refresh_token")).toBe(
      JSON.stringify(nextRefreshToken),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST" },
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
    expect(removeItem).toHaveBeenCalledTimes(1);
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
    expect(values.get("aui:refresh_token")).toBe(JSON.stringify(refreshToken));
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
      },
    );
    expect(setItem).not.toHaveBeenCalled();
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
