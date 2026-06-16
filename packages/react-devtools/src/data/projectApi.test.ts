import { describe, expect, it } from "vitest";
import { projectApi } from "./projectApi";

type Scope = (() => unknown) & {
  source: string | null;
  query: Record<string, unknown> | null;
};

const scope = (
  source: string | null,
  query: Record<string, unknown> | null,
  value: unknown,
): Scope => {
  const fn = (() => value) as Scope;
  fn.source = source;
  fn.query = query;
  return fn;
};

describe("projectApi", () => {
  const entry = {
    api: {
      thread: scope(
        "root",
        {},
        {
          getState: () => ({ messages: [], isRunning: false }),
          append: () => {},
          getModelContext: () => ({ system: "be nice", tools: [] }),
        },
      ),
      composer: scope(
        "root",
        {},
        {
          getState: () => ({ text: "hello" }),
        },
      ),
      message: scope(
        "messages",
        { index: 0 },
        {
          getState: () => ({}),
        },
      ),
    },
    logs: [{ time: new Date(0), event: "thread.run-start", data: { foo: 1 } }],
  } as unknown as Parameters<typeof projectApi>[1];

  const result = projectApi(7, entry);

  it("carries the api id", () => {
    expect(result.id).toBe(7);
  });

  it("collects root-scope state by scope name", () => {
    expect(result.state.thread).toEqual({ messages: [], isRunning: false });
    expect(result.state.composer).toEqual({ text: "hello" });
  });

  it("omits non-root scopes from state but keeps them in the scope graph", () => {
    expect(result.state.message).toBeUndefined();
    const scopes = result.scopes as Array<{
      name: string;
      source: string | null;
      methods: string[];
    }>;
    const thread = scopes.find((s) => s.name === "thread");
    expect(thread?.source).toBe("root");
    expect(thread?.methods).toEqual(
      expect.arrayContaining(["getState", "append", "getModelContext"]),
    );
    expect(scopes.find((s) => s.name === "message")?.source).toBe("messages");
  });

  it("normalizes the model context from the thread scope", () => {
    expect(result.modelContext).toEqual({ system: "be nice" });
  });

  it("keeps event-log timestamps as Date instances", () => {
    expect(result.logs[0]?.time).toBeInstanceOf(Date);
    expect(result.logs[0]?.event).toBe("thread.run-start");
    expect(result.logs[0]?.data).toEqual({ foo: 1 });
  });

  it("does not throw on scopes whose accessor throws", () => {
    const broken = scope("root", {}, undefined);
    const throwing = (() => {
      throw new Error("not mounted");
    }) as unknown as Scope;
    throwing.source = "derived";
    throwing.query = null;
    const result = projectApi(1, {
      api: { broken, throwing },
      logs: [],
    } as unknown as Parameters<typeof projectApi>[1]);
    const scopes = result.scopes as Array<{ name: string }>;
    expect(scopes.map((s) => s.name)).toEqual(["broken", "throwing"]);
  });
});
