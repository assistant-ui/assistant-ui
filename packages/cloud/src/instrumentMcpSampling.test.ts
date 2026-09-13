import { describe, expect, it, vi } from "vitest";
import {
  wrapSamplingHandler,
  createSamplingCollector,
  type McpSamplingRequest,
} from "./instrumentMcpSampling";

const request: McpSamplingRequest = {
  method: "sampling/createMessage",
  params: { messages: [], maxTokens: 10 },
};

describe("wrapSamplingHandler", () => {
  it("returns the response and records sampling metrics", async () => {
    const collector = createSamplingCollector();
    const response = {
      model: "test-model",
      content: { type: "text", text: "hello" },
      usage: { inputTokens: 2, outputTokens: 3 },
    };
    const handler = vi.fn(async () => response);
    await expect(
      wrapSamplingHandler(handler, collector.collect)(request),
    ).resolves.toBe(response);
    expect(handler).toHaveBeenCalledWith(request);
    expect(collector.getCalls()).toEqual([
      {
        model_id: "test-model",
        input_tokens: 2,
        output_tokens: 3,
        duration_ms: 0,
      },
    ]);
  });

  it.each([false, true])(
    "preserves successful responses when the observer fails asynchronously=%s",
    async (asynchronous) => {
      const error = new Error("metrics unavailable");
      const observer = asynchronous
        ? async () => {
            throw error;
          }
        : () => {
            throw error;
          };
      const response = { content: "successful response" };
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await expect(
          wrapSamplingHandler(async () => response, observer)(request),
        ).resolves.toBe(response);
        expect(log).toHaveBeenCalledWith(
          "[assistant-cloud] onSamplingCall callback threw an error",
          error,
        );
      } finally {
        log.mockRestore();
      }
    },
  );

  it("does not await an asynchronous observer", async () => {
    const response = { content: "successful response" };
    await expect(
      wrapSamplingHandler(
        async () => response,
        () => new Promise<void>(() => {}),
      )(request),
    ).resolves.toBe(response);
  });

  it("propagates model errors without calling the observer", async () => {
    const error = new Error("model failed");
    const observer = vi.fn();
    await expect(
      wrapSamplingHandler(async () => {
        throw error;
      }, observer)(request),
    ).rejects.toBe(error);
    expect(observer).not.toHaveBeenCalled();
  });

  it("preserves successful responses even if error reporting throws", async () => {
    const response = { content: "successful response" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("logging failed");
    });
    try {
      await expect(
        wrapSamplingHandler(
          async () => response,
          () => {
            throw new Error("metrics failed");
          },
        )(request),
      ).resolves.toBe(response);
    } finally {
      log.mockRestore();
    }
  });
});
