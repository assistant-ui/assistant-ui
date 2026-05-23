import { describe, expect, it } from "vitest";
import { GorpServer } from "../src/GorpServer";
import { GorpRelay } from "../src/GorpRelay";
import { GorpSessions } from "../src/GorpSessions";
import type { GorpMessage } from "../src/Gorp";

type State = { count: number; items: Record<string, { name: string }> };
type Command =
  | { type: "addItem"; id: string; name: string }
  | { type: "incCount" };

const initial = (): State => ({ count: 0, items: {} });
const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

function recordingClient() {
  const inbox: GorpMessage[] = [];
  return {
    inbox,
    send: (msg: GorpMessage) => {
      inbox.push(JSON.parse(JSON.stringify(msg)));
    },
  };
}

describe("GorpSessions — over GorpServer", () => {
  it("addClient sends an initial snapshot envelope", () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sessions = new GorpSessions<Command>(server);
    const c = recordingClient();
    sessions.addClient("A", 0, c.send);
    expect(c.inbox).toHaveLength(1);
    expect(c.inbox[0]!.ops).toEqual([
      { type: "set", path: [], value: { count: 0, items: {} } },
    ]);
    expect(c.inbox[0]!.ack).toBeUndefined();
  });

  it("acks the highest-processed seq per session after receive", async () => {
    const server = new GorpServer<State, Command>(initial(), (_state, cmd) => {
      if (cmd.type === "addItem") {
        server.state.items[cmd.id] = { name: cmd.name };
      }
    });
    const sessions = new GorpSessions<Command>(server);
    const c = recordingClient();
    const handle = sessions.addClient("A", 0, c.send);
    handle.receive({ type: "addItem", id: "a", name: "alpha" });
    await flushMicrotasks();
    const last = c.inbox[c.inbox.length - 1]!;
    expect(last.ops).toEqual([
      { type: "set", path: ["items", "a"], value: { name: "alpha" } },
    ]);
    expect(last.ack).toBe(0);
  });

  it("dedups a re-sent seq without re-running the handler", async () => {
    let handlerCalls = 0;
    const server = new GorpServer<State, Command>(initial(), () => {
      handlerCalls += 1;
    });
    const sessions = new GorpSessions<Command>(server);
    const c1 = recordingClient();
    const h1 = sessions.addClient("A", 0, c1.send);
    h1.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(handlerCalls).toBe(1);
    h1.remove();

    // Same session reconnects from fromSeq=0 and resends.
    const c2 = recordingClient();
    const h2 = sessions.addClient("A", 0, c2.send);
    h2.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(handlerCalls).toBe(1); // dedup'd
    expect(c2.inbox[0]!.ack).toBe(0); // initial snapshot carries prior ack
  });

  it("fans out to multiple sessions with per-session acks", async () => {
    const server = new GorpServer<State, Command>(initial(), (_state, cmd) => {
      if (cmd.type === "incCount") server.state.count += 1;
    });
    const sessions = new GorpSessions<Command>(server);
    const a = recordingClient();
    const b = recordingClient();
    const ah = sessions.addClient("A", 0, a.send);
    const bh = sessions.addClient("B", 0, b.send);

    ah.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(a.inbox[a.inbox.length - 1]!.ack).toBe(0);
    expect(b.inbox[b.inbox.length - 1]!.ack).toBeUndefined();

    bh.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(b.inbox[b.inbox.length - 1]!.ack).toBe(0);
  });
});

describe("GorpSessions — over GorpRelay", () => {
  /**
   * Wires a relay through a raw GorpServer (no GorpSessions on the upstream).
   * The upstream subscribes-then-relays its envelopes verbatim, mirroring how
   * the sandbox-runner ships GorpServer envelopes to the DO over WS.
   */
  function makeFixture() {
    const upstream = new GorpServer<State, Command>(
      initial(),
      (_state, cmd) => {
        if (cmd.type === "addItem") {
          upstream.state.items[cmd.id] = { name: cmd.name };
        } else {
          upstream.state.count += 1;
        }
      },
    );

    const relay = new GorpRelay<State, Command>(initial(), (cmd) => {
      upstream.receive(cmd);
    });
    const sessions = new GorpSessions<Command>(relay);

    upstream.subscribe((env) => relay.applyUpstream(env));

    return { upstream, relay, sessions };
  }

  it("end-to-end: browser → relay → upstream → ack back to browser", async () => {
    const f = makeFixture();
    const browser = recordingClient();
    const handle = f.sessions.addClient("browser-A", 0, browser.send);
    handle.receive({ type: "addItem", id: "a", name: "alpha" });
    await flushMicrotasks();
    expect(f.upstream.state.items.a).toEqual({ name: "alpha" });
    expect(browser.inbox[browser.inbox.length - 1]!.ack).toBe(0);
  });

  it("two browsers see the same ops but their own per-session acks", async () => {
    const f = makeFixture();
    const a = recordingClient();
    const b = recordingClient();
    const ah = f.sessions.addClient("A", 0, a.send);
    const bh = f.sessions.addClient("B", 0, b.send);

    ah.receive({ type: "incCount" });
    await flushMicrotasks();
    const aLast = a.inbox[a.inbox.length - 1]!;
    const bLast = b.inbox[b.inbox.length - 1]!;
    expect(aLast.ops).toEqual([{ type: "set", path: ["count"], value: 1 }]);
    expect(bLast.ops).toEqual([{ type: "set", path: ["count"], value: 1 }]);
    expect(aLast.ack).toBe(0);
    expect(bLast.ack).toBeUndefined();

    bh.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(b.inbox[b.inbox.length - 1]!.ack).toBe(0);
  });
});

describe("GorpSessions — persistence", () => {
  it("round-trips sessions; lastForwardedSeq rebuilt from highWater", async () => {
    const server = new GorpServer<State, Command>(initial(), () => {});
    const sessions = new GorpSessions<Command>(server);
    const c = recordingClient();
    const h = sessions.addClient("A", 0, c.send);
    h.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(sessions.sessions.get("A")?.highWater).toBe(0);

    const snapshot = sessions.serialize();
    expect(snapshot.sessions.A).toEqual({ highWater: 0 });

    // Restore into a fresh wrapper around a fresh server.
    let handlerCalls = 0;
    const freshServer = new GorpServer<State, Command>(initial(), () => {
      handlerCalls += 1;
    });
    const fresh = new GorpSessions<Command>(freshServer);
    fresh.restore(snapshot);
    expect(fresh.sessions.get("A")?.highWater).toBe(0);

    // Resending seq=0 from a reconnected browser is dedup'd because
    // lastForwardedSeq was rebuilt from highWater.
    const c2 = recordingClient();
    const h2 = fresh.addClient("A", 0, c2.send);
    h2.receive({ type: "incCount" });
    await flushMicrotasks();
    expect(handlerCalls).toBe(0);
  });
});
