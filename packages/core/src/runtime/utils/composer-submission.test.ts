import { describe, expect, it } from "vitest";
import { matchInTransit, retainInTransit } from "./composer-submission";

describe("in-transit submission matching", () => {
  it("lets the oldest eligible submission claim one new message", () => {
    const unmatched = { role: "system", known: new Set<string>() };
    const first = { role: "user", known: new Set<string>() };
    const second = { role: "user", known: new Set<string>() };
    const assistant = { role: "assistant", known: new Set<string>() };
    const entries = [unmatched, first, second, assistant];
    const match = matchInTransit(
      entries,
      () => ["old|user", "new|user", "answer|assistant"],
      (entry, key) => key.endsWith(`|${entry.role}`),
    );
    expect([...match.landed]).toEqual([first, second, assistant]);
    expect([...match.claimed]).toEqual([
      "old|user",
      "new|user",
      "answer|assistant",
    ]);
  });

  it("keeps known messages from matching and carries claimed keys to survivors", () => {
    const first = { role: "user", known: new Set(["old|user"]) };
    const second = { role: "user", known: new Set(["old|user"]) };
    const entries = [first, second];
    const match = matchInTransit(
      entries,
      () => ["old|user", "new|user"],
      (entry, key) => key.endsWith(`|${entry.role}`),
    );
    expect([...match.landed]).toEqual([first]);
    const retained = retainInTransit(entries, match);
    expect(retained).toHaveLength(1);
    expect(retained[0]).not.toBe(second);
    expect([...retained[0]!.known]).toEqual(["old|user", "new|user"]);
    expect(
      matchInTransit(retained, () => ["old|user", "new|user"]).landed.size,
    ).toBe(0);
  });

  it("ignores a same-role message prepended before the known messages", () => {
    const entry = { role: "user", known: new Set(["u2|user", "a2|assistant"]) };
    const match = matchInTransit(
      [entry],
      () => ["u1|user", "a1|assistant", "u2|user", "a2|assistant"],
      (e, key) => key.endsWith(`|${e.role}`),
    );
    expect([...match.landed]).toEqual([]);
    expect([...match.claimed]).toEqual([]);
  });

  it("does not let prepended history settle multiple waiting sends", () => {
    const first = { role: "user", known: new Set(["u2|user", "a2|assistant"]) };
    const second = {
      role: "user",
      known: new Set(["u2|user", "a2|assistant"]),
    };
    const keys = ["u1|user", "a1|assistant", "u2|user", "a2|assistant"];
    const match = matchInTransit(
      [first, second],
      () => keys,
      (e, key) => key.endsWith(`|${e.role}`),
    );
    expect([...match.landed]).toEqual([]);
    expect([...match.claimed]).toEqual([]);
  });

  it("still lands a same-role message appended after the known ones", () => {
    const entry = { role: "user", known: new Set(["u2|user", "a2|assistant"]) };
    const match = matchInTransit(
      [entry],
      () => ["u2|user", "a2|assistant", "m1|user"],
      (e, key) => key.endsWith(`|${e.role}`),
    );
    expect([...match.landed]).toEqual([entry]);
    expect([...match.claimed]).toEqual(["m1|user"]);
  });

  it("accepts role-filtered message ids for legacy submissions", () => {
    const first = { role: "assistant", known: new Set(["existing"]) };
    const second = { role: "user", known: new Set<string>() };
    const match = matchInTransit([first, second], (entry) =>
      entry.role === "assistant" ? ["existing", "answer"] : undefined,
    );
    expect([...match.landed]).toEqual([first]);
    expect([...match.claimed]).toEqual(["answer"]);
  });
});
