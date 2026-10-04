import type { ThreadMessage } from "@assistant-ui/react";
import { describe, expect, it } from "vitest";

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
    const question = message("u1", "user", "# Question\n\n- More details");

    expect(projectConversationMap([question]).entries).toEqual([
      { id: "u1", title: "Question", preview: "More details" },
    ]);
    expect(
      projectConversationMap([
        question,
        message("a1", "assistant", "# Answer\n\n- Next step"),
      ]).entries,
    ).toEqual([{ id: "u1", title: "Question", preview: "Answer Next step" }]);
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
    const messages = Array.from({ length: 1000 }, (_, index) =>
      counted(index, `Message ${index}`),
    );
    const before = projectConversationMap(messages);

    expect(reads).toBe(1000);
    const after = projectConversationMap(
      [...messages.slice(0, -1), counted(999, "New token")],
      before,
    );

    expect(reads).toBe(1001);
    expect(after.turns[0]).toBe(before.turns[0]);
    expect(after.entries[0]).toBe(before.entries[0]);
    expect(after.entries.at(-1)?.preview).toBe("New token");
    expect(after.turnOf).toBe(before.turnOf);
  });

  it("does not regroup, describe, or re-own earlier turns during tail streaming", () => {
    let prefixReads = 0;
    const prefix = Array.from({ length: 998 }, (_, index) =>
      Object.defineProperties(
        message(
          String(index),
          index % 2 ? "assistant" : "user",
          `Message ${index}`,
        ),
        {
          role: {
            get: () => {
              prefixReads++;
              return index % 2 ? "assistant" : "user";
            },
          },
          id: {
            get: () => {
              prefixReads++;
              return String(index);
            },
          },
        },
      ),
    );
    const question = message("u", "user", "Question");
    const messages = [...prefix, question, message("a", "assistant", "Old")];
    const before = projectConversationMap(messages);
    prefixReads = 0;

    const after = projectConversationMap(
      [...prefix, question, message("a", "assistant", "New")],
      before,
    );

    expect(prefixReads).toBe(0);
    expect(after.entries.at(-1)?.preview).toBe("New");
    expect(after.turnOf).toBe(before.turnOf);
    expect(before.entries.at(-1)?.preview).toBe("Old");
  });

  it("reuses projection structures when only the outer array changes", () => {
    const messages = [message("u", "user", "Question")];
    const before = projectConversationMap(messages);
    const copy = [...messages];
    const after = projectConversationMap(copy, before);

    expect(after.messages).toBe(copy);
    expect(after.turns).toBe(before.turns);
    expect(after.entries).toBe(before.entries);
    expect(after.turnOf).toBe(before.turnOf);
  });

  it.each(["user", "assistant"] as const)("updates a %s turn head", (role) => {
    const before = projectConversationMap([message("head", role, "Old")]);
    const replacement = message("head", role, "New");
    const after = projectConversationMap([replacement], before);

    expect(after.entries).toEqual([{ id: "head", title: "New" }]);
    expect(after.turns[0]?.head).toBe(replacement);
    expect(after.turnOf).toBe(before.turnOf);
    expect(before.entries).toEqual([{ id: "head", title: "Old" }]);
  });

  it("keeps an ignored tail out of the projection", () => {
    const question = message("u", "user", "Question");
    const before = projectConversationMap([
      question,
      message("s", "system", "Old"),
    ]);
    const after = projectConversationMap(
      [question, message("s", "system", "New")],
      before,
    );

    expect(after.turns).toBe(before.turns);
    expect(after.entries).toBe(before.entries);
    expect(after.turnOf).toBe(before.turnOf);
  });

  it("rebuilds when an earlier message changes with the tail", () => {
    const question = message("u1", "user", "Question");
    const before = projectConversationMap([
      message("s", "system"),
      question,
      message("a", "assistant", "Old"),
    ]);
    const messages = [
      message("s", "user", "New turn"),
      question,
      message("a", "assistant", "New"),
    ];
    const after = projectConversationMap(messages, before);

    expect(after).toEqual(projectConversationMap(messages));
    expect(after.entries).toHaveLength(2);
    expect(after.entries[1]?.preview).toBe("New");
  });

  it("keeps projections correct when a newer render is abandoned", () => {
    const messages = [
      message("u1", "user", "First"),
      message("a1", "assistant", "Answer"),
    ];
    const original = projectConversationMap(messages);
    const alternateMessages = [messages[0]!, message("u2", "user", "Second")];
    const alternate = projectConversationMap(alternateMessages, original);
    const restored = projectConversationMap(messages, alternate);

    expect(restored).toEqual(original);
    expect(alternate).toEqual(projectConversationMap(alternateMessages));
    expect(original).toEqual(projectConversationMap(messages));
  });
});
