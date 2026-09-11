import { describe, expect, it } from "vitest";
import type { ThreadUserMessage } from "../../types/message";
import { createMessageRepositorySession } from "./message-repository-session";

const message = (id: string, text = id): ThreadUserMessage => ({
  id,
  role: "user",
  createdAt: new Date(0),
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
});

const withRootAndChild = () => {
  const session = createMessageRepositorySession();
  session.addOrUpdateMessage(null, message("root"));
  session.addOrUpdateMessage("root", message("child"));
  return session;
};

describe("createMessageRepositorySession", () => {
  it("memoizes exports and invalidates them after every mutator", () => {
    const cases = [
      () => {
        const session = createMessageRepositorySession();
        return {
          session,
          mutate: () => session.addOrUpdateMessage(null, message("root")),
        };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        session.addOrUpdateMessage("root", message("child"));
        return { session, mutate: () => session.deleteMessage("child") };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        session.addOrUpdateMessage("root", message("child"));
        return {
          session,
          mutate: () => expect(session.tryDeleteMessage("child")).toBe(true),
        };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        session.addOrUpdateMessage("root", message("first"));
        session.addOrUpdateMessage("root", message("second"));
        return { session, mutate: () => session.switchToBranch("first") };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        session.addOrUpdateMessage("root", message("child"));
        return { session, mutate: () => session.resetHead("root") };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        return { session, mutate: () => session.clear() };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("root"));
        return {
          session,
          mutate: () =>
            expect(
              session.updateMessage("root", (current) => ({
                ...current,
                content: [{ type: "text", text: "updated" }],
              })),
            ).toBe(true),
        };
      },
      () => {
        const session = createMessageRepositorySession();
        session.addOrUpdateMessage(null, message("previous"));
        return {
          session,
          mutate: () =>
            session.applyExternalMessageRepository({
              headId: "root",
              messages: [{ parentId: null, message: message("root") }],
            }),
        };
      },
    ];

    for (const createCase of cases) {
      const { session, mutate } = createCase();
      const exported = session.export();
      expect(session.export()).toBe(exported);

      mutate();

      expect(session.export()).not.toBe(exported);
    }
  });

  it("decorates and memoizes exports", () => {
    let decorations = 0;
    const session = createMessageRepositorySession({
      decorateExport: (exported) => {
        decorations++;
        return { ...exported, headId: "decorated" };
      },
    });
    session.addOrUpdateMessage(null, message("root"));

    const exported = session.export();

    expect(exported.headId).toBe("decorated");
    expect(session.export()).toBe(exported);
    expect(decorations).toBe(1);

    session.addOrUpdateMessage("root", message("child"));

    expect(session.export()).not.toBe(exported);
    expect(decorations).toBe(2);
  });

  it("preserves the export cache when an update returns the current message", () => {
    const session = withRootAndChild();
    const exported = session.export();

    expect(session.updateMessage("child", (current) => current)).toBe(false);
    expect(session.export()).toBe(exported);
  });

  it("imports out-of-order parent-child pairs topologically", () => {
    const session = createMessageRepositorySession();

    session.applyExternalMessageRepository({
      headId: "child",
      messages: [
        { parentId: "root", message: message("child") },
        { parentId: null, message: message("root") },
      ],
    });

    expect(session.getMessages().map((item) => item.id)).toEqual([
      "root",
      "child",
    ]);
  });

  it("uses the degenerate linear path for duplicate message ids", () => {
    const session = createMessageRepositorySession();

    session.applyExternalMessageRepository({
      headId: "root",
      messages: [
        { parentId: null, message: message("root", "first") },
        { parentId: "root", message: message("child") },
        { parentId: "child", message: message("root", "replacement") },
      ],
    });

    expect(session.tryGetMessage("root")?.message.content).toEqual([
      { type: "text", text: "replacement" },
    ]);
  });

  it("uses the degenerate linear path when the head is missing", () => {
    const session = createMessageRepositorySession();

    session.applyExternalMessageRepository({
      headId: "missing",
      messages: [
        { parentId: null, message: message("root") },
        { parentId: null, message: message("child") },
      ],
    });

    expect(session.tryGetMessage("child")?.parentId).toBe("root");
  });

  it("preserves an already-imported message parent in the degenerate path", () => {
    const session = createMessageRepositorySession();

    session.applyExternalMessageRepository({
      messages: [
        { parentId: null, message: message("root") },
        { parentId: "root", message: message("branch", "first") },
        { parentId: "branch", message: message("child") },
        { parentId: "child", message: message("branch", "replacement") },
      ],
    });

    expect(session.tryGetMessage("branch")?.parentId).toBe("root");
  });
});
