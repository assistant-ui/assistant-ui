import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkBuilderRateLimit: vi.fn(),
  requireAiBuilderUser: vi.fn(),
  resolveXuluxModel: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal()),
  isAiPlaygroundEnabled: true,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal()),
  checkBuilderRateLimit: mocks.checkBuilderRateLimit,
}));

vi.mock("@/lib/ai-builder-auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAiBuilderUser: mocks.requireAiBuilderUser,
}));

vi.mock("./resolve-model", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveXuluxModel: mocks.resolveXuluxModel,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  streamText: mocks.streamText,
}));

import { createXuluxChatHandler } from "./handler";
import type { XuluxAgentDefinition } from "./agents";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAiBuilderUser.mockResolvedValue({ userId: "user_123" });
});

describe("createXuluxChatHandler rate limiting", () => {
  it.each([429, 503])(
    "returns a %s limiter response before model selection",
    async (status) => {
      const denied = new Response("Denied", { status });
      mocks.checkBuilderRateLimit.mockResolvedValue(denied);
      const handler = createXuluxChatHandler({} as XuluxAgentDefinition);
      const request = new Request(
        "https://www.assistant-ui.com/api/xulux/chat",
        { method: "POST", body: "{}" },
      );

      const result = await handler(request);

      expect(result).toBe(denied);
      expect(mocks.checkBuilderRateLimit).toHaveBeenCalledWith(
        request,
        "user:user_123",
      );
      expect(mocks.resolveXuluxModel).not.toHaveBeenCalled();
      expect(mocks.streamText).not.toHaveBeenCalled();
    },
  );
});
