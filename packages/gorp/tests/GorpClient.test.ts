import { describe, expect, it } from "vitest";
import { GorpClient } from "../src/GorpClient";

type State = {
  count: number;
  items: Record<string, { name: string }>;
};

type Command =
  | { type: "addItem"; id: string; name: string }
  | { type: "incCount" };

const initial = (): State => ({ count: 0, items: {} });

function makeClient() {
  const replays: Array<{ command: Command; seq: number }> = [];
  const mutator = (state: State, command: Command, seq: number) => {
    replays.push({ command, seq });
    if (command.type === "addItem") {
      state.items[command.id] = { name: command.name };
    } else {
      state.count++;
    }
  };
  const client = new GorpClient<State, Command>({
    initialState: initial(),
    mutator: mutator,
  });
  return { client, replays };
}

describe("GorpClient — send / apply basics", () => {
  it("send writes appear in getChangedKeys for the same frame", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    expect(client.getChangedKeys(["items"])).toEqual(["a"]);
    expect(client.state.items.a).toEqual({ name: "alpha" });
    expect(client.pending).toHaveLength(1);
    expect(client.firstPendingSeq).toBe(0);
  });

  it("apply with no ack advances committed without touching pending", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    client.apply({
      ops: [{ type: "set", path: ["count"], value: 7 }],
    });
    // Committed-side count surfaces; pending mutation still applied on top.
    expect(client.state.count).toBe(7);
    expect(client.state.items.a).toEqual({ name: "alpha" });
    expect(client.pending).toHaveLength(1);
  });

  it("apply with ack covering all pending leaves optimistic == committed", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "opt-0", name: "alpha" });
    client.apply({
      ops: [{ type: "set", path: ["items", "real"], value: { name: "alpha" } }],
      ack: 0,
    });
    expect(client.pending).toHaveLength(0);
    expect(Object.keys(client.state.items)).toEqual(["real"]);
  });

  it("apply with ack covering some pending splices and replays the rest", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    client.send({ type: "addItem", id: "b", name: "beta" });
    client.apply({
      ops: [
        { type: "set", path: ["items", "a"], value: { name: "alpha-server" } },
      ],
      ack: 0,
    });
    expect(client.pending).toHaveLength(1);
    expect(client.firstPendingSeq).toBe(1);
    // a is now the server version; b stays optimistic.
    expect(client.state.items).toEqual({
      a: { name: "alpha-server" },
      b: { name: "beta" },
    });
  });

  it("idempotent re-ack: apply with ack < firstPendingSeq is a no-op splice", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    client.send({ type: "addItem", id: "b", name: "beta" });
    client.apply({ ops: [], ack: 0 });
    // Server resends ack=0 for some reason after we already spliced cmd1.
    client.apply({ ops: [], ack: 0 });
    expect(client.pending).toHaveLength(1);
    expect(client.firstPendingSeq).toBe(1);
  });
});

describe("GorpClient — replay determinism", () => {
  it("mutator receives the same seq across replays of the same command", () => {
    const { client, replays } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    // No-ack apply forces a rebuild → cmd1 is replayed.
    client.apply({
      ops: [{ type: "set", path: ["count"], value: 1 }],
    });
    client.send({ type: "addItem", id: "b", name: "beta" });
    // Another no-ack apply → both are replayed.
    client.apply({
      ops: [{ type: "set", path: ["count"], value: 2 }],
    });
    const seqsForA = replays
      .filter((r) => r.command.type === "addItem" && r.command.id === "a")
      .map((r) => r.seq);
    const seqsForB = replays
      .filter((r) => r.command.type === "addItem" && r.command.id === "b")
      .map((r) => r.seq);
    expect(new Set(seqsForA)).toEqual(new Set([0]));
    expect(new Set(seqsForB)).toEqual(new Set([1]));
    expect(seqsForA.length).toBeGreaterThan(1); // confirm it was actually replayed
    expect(seqsForB.length).toBeGreaterThan(1);
  });

  it("mutator producing different writes after committed advances surfaces both old and new paths in changes", () => {
    type SmartState = { latestId: string | null; tags: Record<string, true> };
    type SmartCommand = { type: "tag" };
    const initialSmart = (): SmartState => ({
      latestId: null,
      tags: {},
    });
    // Mutator reads latestId from committed state and tags whichever id is
    // current. Replay against a different latestId produces a different tag.
    const mutator = (state: SmartState, _: SmartCommand) => {
      if (state.latestId) state.tags[state.latestId] = true;
    };
    const client = new GorpClient<SmartState, SmartCommand>({
      initialState: initialSmart(),
      mutator,
    });
    // Server says latestId is "first".
    client.apply({
      ops: [{ type: "set", path: ["latestId"], value: "first" }],
    });
    client.send({ type: "tag" });
    expect(client.state.tags).toEqual({ first: true });
    // Server advances latestId; pending is unchanged but its replay now
    // produces a different write.
    client.apply({
      ops: [{ type: "set", path: ["latestId"], value: "second" }],
    });
    expect(client.state.tags).toEqual({ second: true });
    // Both "first" (reverted) and "second" (newly set) should be visible
    // as changes the consumer needs to re-read.
    expect(new Set(client.getChangedKeys(["tags"]))).toEqual(
      new Set(["first", "second"]),
    );
  });
});

describe("GorpClient — change-tracking edge cases", () => {
  it("a pending mutation reverted by an ack appears as changed in the rebuild frame", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "opt-0", name: "alpha" });
    // Server acks but commits a *different* id (rejected/remapped).
    client.apply({
      ops: [{ type: "set", path: ["items", "real"], value: { name: "alpha" } }],
      ack: 0,
    });
    expect(new Set(client.getChangedKeys(["items"]))).toEqual(
      new Set(["opt-0", "real"]),
    );
    // Consumer reading items["opt-0"] sees undefined → can drop the
    // optimistic entry.
    expect(client.state.items["opt-0"]).toBeUndefined();
    expect(client.state.items.real).toEqual({ name: "alpha" });
  });

  it("apply with set [] (full snapshot) marks all changed keys via diffKeys", () => {
    const { client } = makeClient();
    client.apply({
      ops: [{ type: "set", path: ["items", "a"], value: { name: "alpha" } }],
    });
    client.apply({
      ops: [{ type: "set", path: ["items", "b"], value: { name: "beta" } }],
    });
    // Now full-snapshot replace: drops a, keeps b, adds c.
    const snapshot: State = {
      count: 99,
      items: {
        b: { name: "beta-new" },
        c: { name: "gamma" },
      },
    };
    client.apply({
      ops: [{ type: "set", path: [], value: snapshot }],
    });
    // diffKeys returns new keys + deleted keys (in reverse).
    expect(client.getChangedKeys(["items"])).toEqual(["b", "c", "a"]);
  });

  it("two send calls back-to-back open separate frames", () => {
    const { client } = makeClient();
    client.send({ type: "addItem", id: "a", name: "alpha" });
    client.send({ type: "addItem", id: "b", name: "beta" });
    // Second send's frame only sees b's writes, not a's.
    expect(client.getChangedKeys(["items"])).toEqual(["b"]);
  });

  it("isChangedAt returns truthy for any path inside a marked subtree", () => {
    const { client } = makeClient();
    client.apply({
      ops: [{ type: "set", path: [], value: initial() }],
    });
    // Root-level set marks the entire tree as changed.
    expect(client.isChangedAt([])).toBe(true);
    expect(client.isChangedAt(["items"])).toBe(true);
    expect(client.isChangedAt(["items", "anything", "deep"])).toBe(true);
  });
});

describe("GorpClient — pending queue accounting", () => {
  it("firstPendingSeq advances correctly across send + ack", () => {
    const { client } = makeClient();
    expect(client.firstPendingSeq).toBe(0);
    client.send({ type: "addItem", id: "a", name: "alpha" });
    client.send({ type: "addItem", id: "b", name: "beta" });
    client.send({ type: "addItem", id: "c", name: "gamma" });
    expect(client.firstPendingSeq).toBe(0);
    expect(client.pending).toHaveLength(3);

    client.apply({ ops: [], ack: 0 });
    expect(client.firstPendingSeq).toBe(1);
    expect(client.pending).toHaveLength(2);

    client.apply({ ops: [], ack: 2 });
    expect(client.firstPendingSeq).toBe(3);
    expect(client.pending).toHaveLength(0);
  });
});
