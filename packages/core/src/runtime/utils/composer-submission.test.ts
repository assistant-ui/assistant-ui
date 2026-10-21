import { describe, expect, it } from "vitest";
import { matchInTransit, retainInTransit } from "./composer-submission";

describe("in-transit submission matching", () => {
  it("lets the oldest eligible submission claim one new message", () => {
    const first = { role: "user", known: new Set<string>() };
    const second = { role: "user", known: new Set<string>() };
    const assistant = { role: "assistant", known: new Set<string>() };
    const entries = [first, second, assistant];
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
