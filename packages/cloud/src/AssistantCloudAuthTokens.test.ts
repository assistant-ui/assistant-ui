import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudAuthTokens } from "./AssistantCloudAuthTokens";

const createCloudAuthTokens = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { tokens: new AssistantCloudAuthTokens(api), makeRequest };
};

describe("AssistantCloudAuthTokens responses", () => {
  it("decodes a valid token response", async () => {
    const { tokens, makeRequest } = createCloudAuthTokens();
    makeRequest.mockResolvedValue({ token: "token-1" });

    await expect(tokens.create()).resolves.toEqual({ token: "token-1" });
    expect(makeRequest).toHaveBeenCalledWith("/auth/tokens", {
      method: "POST",
    });
  });

  it("rejects a response that is missing the token", async () => {
    const { tokens, makeRequest } = createCloudAuthTokens();
    makeRequest.mockResolvedValue({});

    await expect(tokens.create()).rejects.toThrow(
      'Invalid Assistant Cloud response for "token": expected a string',
    );
  });
});
