import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "@assistant-ui/react";

import { projectConversationMap } from "./conversation-map-projection";

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

describe("projectConversationMap", () => {
  it("keeps cleaned titles and previews when a question gains an answer", () => {
    const user = message("u1", "user", "# Question\n\n- More details");
    expect(projectConversationMap([user]).entries).toEqual([
      { id: "u1", title: "Question", preview: "More details" },
    ]);
    expect(
      projectConversationMap([
        user,
        message("a1", "assistant", "# Answer\n\n- Next step"),
      ]).entries,
    ).toEqual([{ id: "u1", title: "Question", preview: "Answer Next step" }]);
    expect(projectConversationMap([user]).entries).toEqual([
      { id: "u1", title: "Question", preview: "More details" },
    ]);
  });

  it("does not skip a changed answer after a changed system message", () => {
    const user = message("u1", "user", "Question");
    projectConversationMap([
      message("s1", "system"),
      user,
      message("a1", "assistant", "Old"),
    ]);
    const updated = projectConversationMap([
      message("s2", "system"),
      user,
      message("a1", "assistant", "New"),
    ]);
    expect(updated.entries[0]?.preview).toBe("New");
  });

  it("does not mutate an earlier render's ownership map", () => {
    const user = message("u1", "user", "First");
    const firstMessages = [user, message("a1", "assistant", "Answer")];
    const first = projectConversationMap(firstMessages);
    const updated = projectConversationMap([
      user,
      message("u2", "user", "Second"),
      message("a2", "assistant", "New answer"),
    ]);
    expect([...first.turnOf]).toEqual([
      ["u1", "u1"],
      ["a1", "u1"],
    ]);
    expect(updated.turnOf.get("a2")).toBe("u2");
    projectConversationMap([...firstMessages]);
    expect(first.messages).toBe(firstMessages);
  });

  it("reads only the replacement message in a 1000-message transcript", () => {
    let reads = 0;
    const counted = (index: number, text: string): ThreadMessage => ({
      ...message(String(index), index % 2 ? "assistant" : "user"),
      get content() {
        reads++;
        return [{ type: "text", text }] as const;
      },
    });
    const messages = Array.from({ length: 1000 }, (_, i) =>
      counted(i, `Message ${i}`),
    );
    const before = projectConversationMap(messages);
    expect(reads).toBe(1000);
    const after = projectConversationMap([
      ...messages.slice(0, -1),
      counted(999, "New token"),
    ]);
    expect(reads).toBe(1001);
    expect(after.entries[0]).toEqual(before.entries[0]);
    expect(after.entries.at(-1)?.preview).toBe("New token");
    expect(after.turnOf).toEqual(before.turnOf);
  });

  it("keeps projections correct when a newer render is abandoned", () => {
    const messages = [
      message("u1", "user", "First"),
      message("a1", "assistant", "Answer"),
    ];
    const original = projectConversationMap(messages);
    const alternateMessages = [messages[0]!, message("u2", "user", "Second")];
    const alternate = projectConversationMap(alternateMessages);
    const restored = projectConversationMap(messages);
    expect(restored).toEqual(original);
    expect(projectConversationMap(messages)).toEqual(restored);
    expect(alternate).toEqual(projectConversationMap(alternateMessages));
    expect(original).toEqual(projectConversationMap(messages));
  });

  it("matches a fresh projection across insertions, deletions, and branch switches", () => {
    const user = message("u1", "user", "Question");
    const answer = message("a1", "assistant", "Answer");
    const system = message("s1", "system");
    const unnamed = message("", "user", "Unnamed");
    const variants = [
      [],
      [system],
      [user],
      [answer],
      [system, user, answer],
      [user, system, answer],
      [user, answer, system],
      [user, message("u2", "user", "Next"), answer],
      [unnamed, user, answer],
      [unnamed, user, message("a1", "assistant", "Updated")],
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
        projectConversationMap(from);
        const actual = projectConversationMap(to);
        const expected = projectConversationMap(
          to.map((item) => ({ ...item })),
        );
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
    const initial = projectConversationMap([
      firstUser,
      firstAssistant,
      secondUser,
      secondAssistant,
    ]);

    expect(reads.count).toBe(4);

    const replacement = counted("a2", "assistant", "New answer");
    const updated = projectConversationMap([
      firstUser,
      firstAssistant,
      secondUser,
      replacement,
    ]);

    expect(reads.count).toBe(5);
    expect(updated.entries[0]).toEqual(initial.entries[0]);
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
    const first = projectConversationMap([message("u1", "user", "First")]);

    const appended = projectConversationMap([
      message("u1", "user", "First"),
      message("u2", "user", "Second"),
    ]);
    expect(appended.entries.map((entry) => entry.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(appended.turnOf.get("u2")).toBe("u2");

    const removed = projectConversationMap([message("u1", "user", "First")]);
    expect(removed.entries).toHaveLength(1);
    expect(removed.turnOf.get("u2")).toBeUndefined();
    expect(removed.entries[0]).toEqual(first.entries[0]);
  });

  it("keeps ignored-message changes out of the projection", () => {
    const user = message("u1", "user", "Hello");
    const initial = projectConversationMap([message("s1", "system"), user]);
    const updated = projectConversationMap([message("s2", "system"), user]);

    expect(updated.entries).toEqual(initial.entries);
    expect(updated.turnOf).toEqual(initial.turnOf);
    expect(updated.turnKey).toBe(initial.turnKey);
  });

  it("keeps turn boundaries correct after ignored-message insertion", () => {
    const first = message("u1", "user", "First");
    const second = message("u2", "user", "Second");
    projectConversationMap([first, second]);
    projectConversationMap([first, message("s1", "system"), second]);

    const assistant = message("a1", "assistant", "Answer");
    const updated = projectConversationMap([
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
