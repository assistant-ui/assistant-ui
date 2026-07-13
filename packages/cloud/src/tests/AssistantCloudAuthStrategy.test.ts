import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantCloudAnonymousAuthStrategy } from "../AssistantCloudAuthStrategy";

const createJwt = () => {
  const payload = Buffer.from(JSON.stringify({ exp: 4_102_444_800 })).toString(
    "base64url",
  );
  return `header.${payload}.signature`;
};

const createTokenResponse = () => ({
  ok: true,
  json: vi.fn().mockResolvedValue({
    access_token: createJwt(),
    refresh_token: {
      token: "refresh-next",
      expires_at: "2100-01-01T00:00:00.000Z",
    },
  }),
});

describe("AssistantCloudAnonymousAuthStrategy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to a new anonymous token when the cached refresh token is malformed", async () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("not-json"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", storage);

    const fetchMock = vi.fn().mockResolvedValue(createTokenResponse());
    vi.stubGlobal("fetch", fetchMock);

    const strategy = new AssistantCloudAnonymousAuthStrategy(
      "https://cloud.example.com",
    );

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${createJwt()}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cloud.example.com/v1/auth/tokens/anonymous",
      { method: "POST" },
    );
  });

  it("continues when browser storage access throws", async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      removeItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
    };
    vi.stubGlobal("localStorage", storage);

    const fetchMock = vi.fn().mockResolvedValue(createTokenResponse());
    vi.stubGlobal("fetch", fetchMock);

    const strategy = new AssistantCloudAnonymousAuthStrategy(
      "https://cloud.example.com",
    );

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${createJwt()}`,
    });
  });

  it("removes a cached refresh token before storing the rotated token", async () => {
    class ConstructableDate {
      constructor(private readonly value?: string) {}

      getTime() {
        if (this.value === "2100-01-01T00:00:00.000Z") {
          return 4_102_444_800_000;
        }
        return 1_672_531_200_000;
      }

      static now() {
        return 1_672_531_200_000;
      }
    }
    vi.stubGlobal("Date", ConstructableDate);

    const storage = {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({
          token: "refresh-old",
          expires_at: "2100-01-01T00:00:00.000Z",
        }),
      ),
      setItem: vi.fn(() => {
        throw new Error("storage full");
      }),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", storage);

    const fetchMock = vi.fn().mockResolvedValue(createTokenResponse());
    vi.stubGlobal("fetch", fetchMock);

    const strategy = new AssistantCloudAnonymousAuthStrategy(
      "https://cloud.example.com",
    );

    await expect(strategy.getAuthHeaders()).resolves.toEqual({
      Authorization: `Bearer ${createJwt()}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cloud.example.com/v1/auth/tokens/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: "refresh-old" }),
      },
    );
    expect(storage.removeItem).toHaveBeenCalledWith("aui:refresh_token");
    expect(storage.removeItem.mock.invocationCallOrder[0]).toBeLessThan(
      storage.setItem.mock.invocationCallOrder[0]!,
    );
  });
});
