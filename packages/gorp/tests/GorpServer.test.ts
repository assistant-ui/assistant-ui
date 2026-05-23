import { describe, expect, it } from "vitest";
import { GorpServer } from "../src/GorpServer";
import type { GorpMessage } from "../src/Gorp";

type State = { count: number; items: Record<string, { name: string }> };
type Command =
  | { type: "addItem"; id: string; name: string }
  | { type: "incCount" };

const initial = (): State => ({ count: 0, items: {} });

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

function recordSubscriber() {
  const envs: GorpMessage[] = [];
  return {
    envs,
    callback: (env: GorpMessage) =>
      envs.push({ ops: env.ops.slice(), ack: env.ack }),
  };
}

describe("GorpServer — state writes", () => {
  it("emits a set op for a deep state write via the proxy", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.state.count = 5;
    await flushMicrotasks();
    expect(sub.envs).toEqual([
      { ops: [{ type: "set", path: ["count"], value: 5 }], ack: undefined },
    ]);
  });

  it("assigning to state emits a single root set op", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    const next: State = { count: 99, items: { x: { name: "ex" } } };
    server.state = next;
    await flushMicrotasks();
    expect(sub.envs[0]!.ops).toEqual([{ type: "set", path: [], value: next }]);
  });

  it("coalesces multiple writes in one tick into a single envelope", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.state.count += 1;
    server.state.items.a = { name: "alpha" };
    await flushMicrotasks();
    expect(sub.envs).toHaveLength(1);
    expect(sub.envs[0]!.ops).toHaveLength(2);
  });
});

describe("GorpServer — receive", () => {
  it("runs the handler and reports ack: 0 after one receive", async () => {
    const seen: Command[] = [];
    const server = new GorpServer<State, Command>(initial(), (_state, cmd) => {
      seen.push(cmd);
    });
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(seen).toEqual([{ type: "incCount" }]);
    expect(sub.envs[0]!.ack).toBe(0);
  });

  it("bundles handler-driven ops and ack in the same envelope", async () => {
    const server = new GorpServer<State, Command>(initial(), (_state, cmd) => {
      if (cmd.type === "addItem") {
        server.state.items[cmd.id] = { name: cmd.name };
      }
    });
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.receive({ type: "addItem", id: "a", name: "alpha" });
    await flushMicrotasks();
    expect(sub.envs).toHaveLength(1);
    expect(sub.envs[0]!.ack).toBe(0);
    expect(sub.envs[0]!.ops).toEqual([
      { type: "set", path: ["items", "a"], value: { name: "alpha" } },
    ]);
  });

  it("ack advances monotonically across receives in one tick", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.receive({ type: "incCount" });
    server.receive({ type: "incCount" });
    server.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(sub.envs).toHaveLength(1);
    expect(sub.envs[0]!.ack).toBe(2);
  });

  it("ack persists across flushes (cumulative)", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    server.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(sub.envs[0]!.ack).toBe(0);
    server.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(sub.envs[1]!.ack).toBe(1);
  });
});

describe("GorpServer — subscribe", () => {
  it("unsubscribes cleanly", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    const unsubscribe = server.subscribe(sub.callback);
    unsubscribe();
    server.state.count = 1;
    await flushMicrotasks();
    expect(sub.envs).toHaveLength(0);
  });

  it("suppresses no-op flushes (no ops, ack unchanged)", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    server.subscribe(sub.callback);
    await flushMicrotasks();
    expect(sub.envs).toHaveLength(0);
  });
});
