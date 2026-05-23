import { describe, expect, it } from "vitest";
import { GorpClient } from "../src/GorpClient";
import { GorpServer } from "../src/GorpServer";
import { GorpSessions } from "../src/GorpSessions";
import type { GorpMessage } from "../src/Gorp";

type State = { count: number; items: Record<string, { name: string }> };
type Command =
  | { type: "addItem"; id: string; name: string }
  | { type: "incCount" };

const initial = (): State => ({ count: 0, items: {} });

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

/**
 * Minimal in-memory transport: routes server → client envelopes through a
 * gate that we can flip on/off to simulate disconnects. `userSend` is what
 * a consumer calls when they want to issue a command — it both runs the
 * client's optimistic mutator and (when connected) hands the command to
 * the server's per-client handle (via the Sessions wrapper).
 */
function setup(sessionId = "session-A") {
  const optimistic = (state: State, cmd: Command, _seq: number) => {
    if (cmd.type === "addItem") {
      state.items[cmd.id] = { name: cmd.name };
    } else {
      state.count += 1;
    }
  };

  const client = new GorpClient<State, Command>({
    initialState: initial(),
    mutator: optimistic,
  });
  const server = new GorpServer<State, Command>({
    initialState: initial(),
    mutator: (_state, cmd) => {
      if (cmd.type === "addItem") {
        server.state.items[cmd.id] = { name: cmd.name };
      } else {
        server.state.count += 1;
      }
    },
  });
  const sessions = new GorpSessions<Command>(server);

  let connected = true;
  let handle: ReturnType<typeof sessions.addClient> | null = null;

  const sendToClient = (msg: GorpMessage) => {
    if (connected) client.apply(msg);
  };

  const connect = () => {
    handle = sessions.addClient(
      sessionId,
      client.firstPendingSeq,
      sendToClient,
    );
    for (const cmd of client.pending) handle.receive(cmd);
  };
  connect();

  return {
    client,
    server,
    sessions,
    userSend(cmd: Command) {
      client.send(cmd);
      if (connected && handle) handle.receive(cmd);
    },
    disconnect() {
      connected = false;
      handle?.remove();
      handle = null;
    },
    reconnect() {
      connected = true;
      connect();
    },
  };
}

describe("integration", () => {
  it("end-to-end: command round-trips through optimistic + commit", async () => {
    const t = setup();
    t.userSend({ type: "addItem", id: "a", name: "alpha" });
    // Optimistically applied immediately.
    expect(t.client.state.items.a).toEqual({ name: "alpha" });
    expect(t.client.pending).toHaveLength(1);
    await flushMicrotasks();
    // Server flushed ack + ops; client splices pending and converges.
    expect(t.client.pending).toHaveLength(0);
    expect(t.server.state.items.a).toEqual({ name: "alpha" });
  });

  it("reconnect: pending re-sent and dedup'd; final state matches a no-disconnect baseline", async () => {
    const t = setup();
    t.userSend({ type: "addItem", id: "a", name: "alpha" });
    t.userSend({ type: "incCount" });
    // Drop before flush — server has processed but client never saw the ack.
    t.disconnect();
    await flushMicrotasks();
    expect(t.client.pending).toHaveLength(2);

    t.reconnect();
    await flushMicrotasks();
    // Pending drains via the snapshot's ack; resends are dedup'd by the
    // Sessions wrapper (no double-application).
    expect(t.client.pending).toHaveLength(0);
    expect(t.server.state.count).toBe(1);
    expect(t.server.state.items.a).toEqual({ name: "alpha" });
    expect(t.client.state).toEqual(t.server.state);
  });

  it("commands sent while disconnected are queued and replayed on reconnect", async () => {
    const t = setup();
    t.disconnect();
    t.userSend({ type: "incCount" });
    t.userSend({ type: "incCount" });
    expect(t.client.pending).toHaveLength(2);
    expect(t.server.state.count).toBe(0);
    t.reconnect();
    await flushMicrotasks();
    expect(t.client.pending).toHaveLength(0);
    expect(t.server.state.count).toBe(2);
    expect(t.client.state.count).toBe(2);
  });

  it("two sessions converge to the same state after the same set of commands", async () => {
    const a = setup("session-A");
    // Same server (via a.sessions); second client joins.
    const b = (() => {
      const optimistic = () => {};
      const client = new GorpClient<State, Command>({
        initialState: initial(),
        mutator: optimistic,
      });
      const sendToB = (msg: GorpMessage) => client.apply(msg);
      const handle = a.sessions.addClient(
        "session-B",
        client.firstPendingSeq,
        sendToB,
      );
      return { client, handle };
    })();

    a.userSend({ type: "addItem", id: "a", name: "alpha" });
    a.userSend({ type: "incCount" });
    await flushMicrotasks();
    expect(b.client.state).toEqual(a.client.state);
    expect(b.client.state.count).toBe(1);
    expect(b.client.state.items.a).toEqual({ name: "alpha" });
  });
});
