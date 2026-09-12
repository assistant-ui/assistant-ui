import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "@assistant-ui/react";

import { ConversationMapProjectionCache } from "./conversation-map-projection";

const message = (
  id: string,
  role: "user" | "assistant" | "system",
  text = "",
) =>
  ({
    id,
    role,
    content: text ? [{ type: "text", text }] : [],
  }) as unknown as ThreadMessage;

describe("ConversationMapProjectionCache", () => {
  it("does not skip a changed answer after a changed system message", () => {
    const cache = new ConversationMapProjectionCache();
    const user = message("u1", "user", "Question");
    cache.project([
      message("s1", "system"),
      user,
      message("a1", "assistant", "Old"),
    ]);
    const updated = cache.project([
      message("s2", "system"),
      user,
      message("a1", "assistant", "New"),
    ]);
    expect(updated.entries[0]?.preview).toBe("New");
  });

  it("does not mutate an earlier render's ownership map", () => {
    const cache = new ConversationMapProjectionCache();
    const user = message("u1", "user", "First");
    const firstMessages = [user, message("a1", "assistant", "Answer")];
    const first = cache.project(firstMessages);
    const updated = cache.project([
      user,
      message("u2", "user", "Second"),
      message("a2", "assistant", "New answer"),
    ]);
    expect([...first.turnOf]).toEqual([
      ["u1", "u1"],
      ["a1", "u1"],
    ]);
    expect(updated.turnOf.get("a2")).toBe("u2");
    cache.project([...firstMessages]);
    expect(first.messages).toBe(firstMessages);
  });

  it("reads only the replacement message in a 1000-message transcript", () => {
    let reads = 0;
    const counted = (index: number, text: string): ThreadMessage => ({
      ...message(String(index), index % 2 ? "assistant" : "user"),
      get content() {
        reads++;
        return [{ type: "text", text }];
      },
    });
    const messages = Array.from({ length: 1000 }, (_, i) =>
      counted(i, `Message ${i}`),
    );
    const cache = new ConversationMapProjectionCache();
    const before = cache.project(messages);
    expect(reads).toBe(1000);
    const after = cache.project([
      ...messages.slice(0, -1),
      counted(999, "New token"),
    ]);
    expect(reads).toBe(1001);
    expect(after.entries[0]).toBe(before.entries[0]);
    expect(after.entries.at(-1)?.preview).toBe("New token");
    expect(after.turnOf).toBe(before.turnOf);
  });

  it("matches a fresh projection across insertions, deletions, and branch switches", () => {
    const cache = new ConversationMapProjectionCache();
    const user = message("u1", "user", "Question");
    const answer = message("a1", "assistant", "Answer");
    const system = message("s1", "system");
    const variants = [
      [],
      [system],
      [user],
      [answer],
      [system, user, answer],
      [user, system, answer],
      [user, answer, system],
      [user, message("u2", "user", "Next"), answer],
      [
        system,
        message("u1", "user", "Edited"),
        message("a1", "assistant", "Other branch"),
      ],
      [
        message("s2", "system"),
        user,
        message("a1", "assistant", "Replacement"),
      ],
    ];
    for (const from of variants) {
      for (const to of variants) {
        cache.project(from);
        const actual = cache.project(to);
        const expected = new ConversationMapProjectionCache().project(to);
        expect(actual.entries).toEqual(expected.entries);
        expect([...actual.turnOf]).toEqual([...expected.turnOf]);
        expect(actual.turnKey).toBe(expected.turnKey);
      }
    }
  });
  it("reuses unchanged summaries during a tail update", () => {
    const reads = { count: 0 };
    const counted = (id: string, role: "user" | "assistant", text: string) => {
      const result = { id, role } as unknown as ThreadMessage;
      Object.defineProperty(result, "content", {
        configurable: true,
        get: () => {
          reads.count++;
          return [{ type: "text", text }];
        },
      });
      return result;
    };

    const firstUser = counted("u1", "user", "First");
    const firstAssistant = counted("a1", "assistant", "Done");
    const secondUser = counted("u2", "user", "Second");
    const secondAssistant = counted("a2", "assistant", "Old answer");
    const cache = new ConversationMapProjectionCache();
    const initial = cache.project([
      firstUser,
      firstAssistant,
      secondUser,
      secondAssistant,
    ]);

    expect(reads.count).toBe(4);

    const replacement = counted("a2", "assistant", "New answer");
    const updated = cache.project([
      firstUser,
      firstAssistant,
      secondUser,
      replacement,
    ]);

    expect(reads.count).toBe(5);
    expect(updated.entries[0]).toBe(initial.entries[0]);
    expect(updated.entries[1]).not.toBe(initial.entries[1]);
    expect(updated.entries[1]).toMatchObject({
      id: "u2",
      title: "Second",
      preview: "New answer",
    });
    expect(updated.turnOf.get("u1")).toBe("u1");
    expect(updated.turnOf.get("a1")).toBe("u1");
    expect(updated.turnOf.get("a2")).toBe("u2");
  });

  it("rebuilds ownership and turn boundaries for structural tail edits", () => {
    const cache = new ConversationMapProjectionCache();
    const first = cache.project([message("u1", "user", "First")]);

    const appended = cache.project([
      message("u1", "user", "First"),
      message("u2", "user", "Second"),
    ]);
    expect(appended.entries.map((entry) => entry.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(appended.turnOf.get("u2")).toBe("u2");

    const removed = cache.project([message("u1", "user", "First")]);
    expect(removed.entries).toHaveLength(1);
    expect(removed.turnOf.get("u2")).toBeUndefined();
    expect(removed.entries[0]).not.toBe(first.entries[0]);
  });

  it("keeps ignored-message changes out of the projection", () => {
    const cache = new ConversationMapProjectionCache();
    const user = message("u1", "user", "Hello");
    const initial = cache.project([message("s1", "system"), user]);
    const updated = cache.project([message("s2", "system"), user]);

    expect(updated.entries).toBe(initial.entries);
    expect(updated.turnOf).toBe(initial.turnOf);
    expect(updated.turnKey).toBe(initial.turnKey);
  });

  it("keeps turn boundaries correct after ignored-message insertion", () => {
    const cache = new ConversationMapProjectionCache();
    const first = message("u1", "user", "First");
    const second = message("u2", "user", "Second");
    cache.project([first, second]);
    cache.project([first, message("s1", "system"), second]);

    const assistant = message("a1", "assistant", "Answer");
    const updated = cache.project([
      first,
      message("s1", "system"),
      assistant,
      second,
    ]);

    expect(updated.entries.map((entry) => entry.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(updated.turnOf.get("a1")).toBe("u1");
  });
});
