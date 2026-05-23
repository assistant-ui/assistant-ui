import { describe, expect, it } from "vitest";
import { GorpRelay } from "../src/GorpRelay";
import type { GorpMessage } from "../src/Gorp";

type State = { count: number };
type Command = { type: "incCount" };

const initial = (): State => ({ count: 0 });

function recordSubscriber() {
  const envs: GorpMessage[] = [];
  return {
    envs,
    callback: (env: GorpMessage) =>
      envs.push({ ops: env.ops.slice(), ack: env.ack }),
  };
}

describe("GorpRelay — forwarding", () => {
  it("forwards each received command via sendUpstream", () => {
    const sent: Command[] = [];
    const relay = new GorpRelay<State, Command>(initial(), (cmd) =>
      sent.push(cmd),
    );
    relay.receive({ type: "incCount" });
    relay.receive({ type: "incCount" });
    expect(sent).toHaveLength(2);
  });
});

describe("GorpRelay — applyUpstream", () => {
  it("applies ops into the state mirror and forwards them to subscribers", () => {
    const relay = new GorpRelay<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    relay.subscribe(sub.callback);
    relay.applyUpstream({
      ops: [{ type: "set", path: ["count"], value: 7 }],
    });
    expect(relay.state.count).toBe(7);
    expect(sub.envs[0]!.ops).toEqual([
      { type: "set", path: ["count"], value: 7 },
    ]);
  });

  it("forwards ack verbatim to subscribers", () => {
    const relay = new GorpRelay<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    relay.subscribe(sub.callback);
    relay.applyUpstream({ ops: [], ack: 5 });
    expect(sub.envs[0]).toEqual({ ops: [], ack: 5 });
  });

  it("synchronous emit — no microtask delay", () => {
    const relay = new GorpRelay<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    relay.subscribe(sub.callback);
    relay.applyUpstream({ ops: [{ type: "set", path: ["count"], value: 1 }] });
    // No `await flushMicrotasks` — already there.
    expect(sub.envs).toHaveLength(1);
  });

  it("suppresses fully-empty envelopes", () => {
    const relay = new GorpRelay<State, Command>(initial(), () => {});
    const sub = recordSubscriber();
    relay.subscribe(sub.callback);
    relay.applyUpstream({ ops: [] });
    expect(sub.envs).toHaveLength(0);
  });
});

describe("GorpRelay — persistence", () => {
  it("round-trips state", () => {
    const relay = new GorpRelay<State, Command>(initial(), () => {});
    relay.applyUpstream({
      ops: [{ type: "set", path: ["count"], value: 5 }],
    });

    const serialized = relay.serialize();
    expect(serialized.state).toEqual({ count: 5 });

    const fresh = new GorpRelay<State, Command>(initial(), () => {});
    fresh.restore(serialized);
    expect(fresh.state).toEqual({ count: 5 });
  });
});
