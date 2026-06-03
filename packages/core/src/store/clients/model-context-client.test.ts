import { describe, it, expect } from "vitest";
import { createResourceRoot } from "@assistant-ui/tap";
import type { Tool } from "assistant-stream";
import { ModelContext } from "./model-context-client";
import type {
  ModelContext as ModelContextValue,
  ModelContextProvider,
} from "../../model-context/types";
import { mergeModelContexts } from "../../model-context/types";

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
});

describe("mergeModelContexts", () => {
  it("merges a higher-priority tool override into an existing tool", () => {
    const execute = async () => ({ ok: true });
    const merged = mergeModelContexts(
      new Set([
        provider({
          priority: 0,
          tools: {
            add_task: {
              type: "frontend",
              description: "Add a task",
              parameters: { type: "object", properties: {} } as any,
              renderText: { running: "Adding task" },
            } as Tool<any, any>,
          },
        }),
        provider({
          priority: 1000,
          tools: {
            add_task: {
              execute,
            } as unknown as Tool<any, any>,
          },
        }),
      ]),
    );

    expect(merged.tools?.add_task).toMatchObject({
      type: "frontend",
      description: "Add a task",
    });
    expect(merged.tools?.add_task?.execute).toBe(execute);
    expect(merged.tools?.add_task?.parameters).toEqual({
      type: "object",
      properties: {},
    });
  });

  it("still rejects duplicate tools at the same priority", () => {
    expect(() =>
      mergeModelContexts(
        new Set([
          provider({ tools: { duplicate: stubTool() } }),
          provider({ tools: { duplicate: stubTool() } }),
        ]),
      ),
    ).toThrow(/already exists/);
  });
});
