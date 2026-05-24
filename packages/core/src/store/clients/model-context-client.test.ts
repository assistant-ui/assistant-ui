import { describe, it, expect } from "vitest";
import { createResourceRoot } from "@assistant-ui/tap";
import type { Tool } from "assistant-stream";
import { ModelContext } from "./model-context-client";
import type {
  ModelContext as ModelContextValue,
  ModelContextProvider,
} from "../../model-context/types";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const provider = (ctx: ModelContextValue): ModelContextProvider => ({
  getModelContext: () => ctx,
});

const stubTool = (): Tool<any, any> =>
  ({ description: "", parameters: {} as any }) as unknown as Tool<any, any>;

const render = () => {
  const root = createResourceRoot();
  const sub = root.render(ModelContext());
  return { sub, unmount: () => root.unmount() };
};

describe("ModelContext", () => {
  it("starts with undefined modelName and an empty toolNames array", () => {
    const { sub, unmount } = render();
    try {
      const state = sub.getValue().getState();
      expect(state.modelName).toBeUndefined();
      expect(state.toolNames).toEqual([]);
      expect(state.deferredToolNames).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("reflects modelName from a registered provider", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(provider({ config: { modelName: "gpt-4" } }));
      await tick();

      expect(sub.getValue().getState().modelName).toBe("gpt-4");
    } finally {
      unmount();
    }
  });

  it("reflects tool names from a registered provider", async () => {
    const { sub, unmount } = render();
    try {
      sub
        .getValue()
        .register(provider({ tools: { foo: stubTool(), bar: stubTool() } }));
      await tick();

      expect(sub.getValue().getState().toolNames).toEqual(["bar", "foo"]);
    } finally {
      unmount();
    }
  });

  it("keeps the same state reference when an extra provider does not change the merged values", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(provider({ config: { modelName: "gpt-4" } }));
      await tick();
      const before = sub.getValue().getState();

      sub.getValue().register(provider({ config: { modelName: "gpt-4" } }));
      await tick();
      const after = sub.getValue().getState();

      expect(after).toBe(before);
    } finally {
      unmount();
    }
  });

  it("clears modelName when the last contributing provider unsubscribes", async () => {
    const { sub, unmount } = render();
    try {
      const unsubscribe = sub
        .getValue()
        .register(provider({ config: { modelName: "gpt-4" } }));
      await tick();
      expect(sub.getValue().getState().modelName).toBe("gpt-4");

      unsubscribe();
      await tick();
      expect(sub.getValue().getState().modelName).toBeUndefined();
      expect(sub.getValue().getState().toolNames).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("reflects modelName synchronously after register without awaiting", () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(provider({ config: { modelName: "gpt-4" } }));

      expect(sub.getValue().getState().modelName).toBe("gpt-4");
    } finally {
      unmount();
    }
  });

  it("reflects deferredToolNames from a provider with deferredTools", async () => {
    const { sub, unmount } = render();
    try {
      sub
        .getValue()
        .register(
          provider({ deferredTools: { alpha: stubTool(), beta: stubTool() } }),
        );
      await tick();

      expect(sub.getValue().getState().deferredToolNames).toEqual([
        "alpha",
        "beta",
      ]);
    } finally {
      unmount();
    }
  });

  it("keeps deferredToolNames separate from toolNames", async () => {
    const { sub, unmount } = render();
    try {
      sub.getValue().register(
        provider({
          tools: { coreTool: stubTool() },
          deferredTools: { deferredTool: stubTool() },
        }),
      );
      await tick();

      expect(sub.getValue().getState().toolNames).toEqual(["coreTool"]);
      expect(sub.getValue().getState().deferredToolNames).toEqual([
        "deferredTool",
      ]);
    } finally {
      unmount();
    }
  });

  it("keeps the same state reference when only an unrelated provider changes but deferred set is stable", async () => {
    const { sub, unmount } = render();
    try {
      const alphaTool = stubTool();
      sub
        .getValue()
        .register(provider({ deferredTools: { alpha: alphaTool } }));
      await tick();
      const before = sub.getValue().getState();

      // Register an unrelated provider (config only) — deferred set unchanged.
      sub.getValue().register(provider({ config: { modelName: undefined } }));
      await tick();
      const after = sub.getValue().getState();

      // State reference is the same when neither toolNames nor deferredToolNames changed.
      expect(after).toBe(before);
      // deferredToolNames content still includes alpha
      expect(after.deferredToolNames).toContain("alpha");
    } finally {
      unmount();
    }
  });
});
