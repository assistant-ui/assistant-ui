import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantCloudAnonymousAuthStrategy } from "../AssistantCloudAuthStrategy";

const baseUrl = "https://test.example.com";
const accessToken = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.sig`;
const refreshToken = { token: "r1", expires_at: "2099-01-01" };

let originalLocalStorageDescriptor: PropertyDescriptor | undefined;

const installLocalStorage = (storage: Storage): void => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
};

const mockAnonymousTokenFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken,
      refresh_token: refreshToken,
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

  it("persists the refresh token and returns the anonymous access token", async () => {
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

    const strategy = new AssistantCloudAnonymousAuthStrategy(baseUrl);

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
    expect(values.get("aui:refresh_token")).toBe(JSON.stringify(refreshToken));
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/auth/tokens/anonymous`,
      { method: "POST" },
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
});
