import { describe, it, expect } from "vitest";
import type { Tool } from "assistant-stream";
import { mergeModelContexts } from "../types";
import type { ModelContextProvider } from "../types";

const provider = (
  ctx: Parameters<typeof mergeModelContexts>[0] extends Set<infer P>
    ? Omit<P, "getModelContext"> & { getModelContext: () => any }
    : never,
): ModelContextProvider => ctx as ModelContextProvider;

const stubTool = (): Tool<any, any> =>
  ({ description: "stub", parameters: {} as any }) as unknown as Tool<any, any>;

const makeProvider = (ctx: {
  tools?: Record<string, Tool<any, any>>;
  deferredTools?: Record<string, Tool<any, any>>;
}): ModelContextProvider => ({
  getModelContext: () => ctx,
});

describe("mergeModelContexts — deferredTools", () => {
  it("merges deferredTools from a single provider", () => {
    const tool = stubTool();
    const providers = new Set([
      makeProvider({ deferredTools: { myTool: tool } }),
    ]);
    const result = mergeModelContexts(providers);
    expect(result.deferredTools).toBeDefined();
    expect(result.deferredTools?.myTool).toBe(tool);
  });

  it("merges deferredTools from multiple providers without collision", () => {
    const toolA = stubTool();
    const toolB = stubTool();
    const providers = new Set([
      makeProvider({ deferredTools: { toolA } }),
      makeProvider({ deferredTools: { toolB } }),
    ]);
    const result = mergeModelContexts(providers);
    expect(result.deferredTools?.toolA).toBe(toolA);
    expect(result.deferredTools?.toolB).toBe(toolB);
  });

  it("throws on deferredTools name collision with different references", () => {
    const toolA = stubTool();
    const toolB = stubTool();
    const providers = new Set([
      makeProvider({ deferredTools: { myTool: toolA } }),
      makeProvider({ deferredTools: { myTool: toolB } }),
    ]);
    expect(() => mergeModelContexts(providers)).toThrow(
      "You tried to define a deferred tool with the name myTool, but it already exists.",
    );
  });

  it("does not throw when same reference is registered from two providers", () => {
    const tool = stubTool();
    const providers = new Set([
      makeProvider({ deferredTools: { myTool: tool } }),
      makeProvider({ deferredTools: { myTool: tool } }),
    ]);
    expect(() => mergeModelContexts(providers)).not.toThrow();
    const result = mergeModelContexts(providers);
    expect(result.deferredTools?.myTool).toBe(tool);
  });

  it("keeps tools and deferredTools in separate slots — same name in both does not throw", () => {
    const toolInCore = stubTool();
    const toolInDeferred = stubTool();
    const providers = new Set([
      makeProvider({ tools: { shared: toolInCore } }),
      makeProvider({ deferredTools: { shared: toolInDeferred } }),
    ]);
    const result = mergeModelContexts(providers);
    expect(result.tools?.shared).toBe(toolInCore);
    expect(result.deferredTools?.shared).toBe(toolInDeferred);
  });

  it("leaves deferredTools undefined when no provider contributes any", () => {
    const tool = stubTool();
    const providers = new Set([makeProvider({ tools: { myTool: tool } })]);
    const result = mergeModelContexts(providers);
    expect(result.deferredTools).toBeUndefined();
  });
});
