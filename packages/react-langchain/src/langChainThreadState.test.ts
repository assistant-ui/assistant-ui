import { describe, expect, it } from "vitest";
import {
  createLangChainThreadState,
  reduceLangChainThreadState,
  type StagedEntry,
  type StagedMessage,
} from "./langChainThreadState";

const message = (
  id: string,
  type = "human",
  content: unknown = id,
): StagedMessage => ({ id, _getType: () => type, content });

const entry = (
  stagedMessage: StagedMessage,
  overrides: Partial<StagedEntry> = {},
): StagedEntry => ({
  message: stagedMessage,
  runConfig: undefined,
  reconcileOnEcho: false,
  baseMessageCount: 0,
  ...overrides,
});

describe("reduceLangChainThreadState", () => {
  it("stages sends and transcripts without changing the previous snapshot", () => {
    const base = message("base");
    const send = message("send");
    const transcript = message("transcript", "ai");
    const initial = createLangChainThreadState();
    const staged = reduceLangChainThreadState(initial, {
      type: "stage",
      entry: entry(send, { reconcileOnEcho: true, baseMessageCount: 1 }),
      visibleMessages: [base],
    });
    const withTranscript = reduceLangChainThreadState(staged, {
      type: "stage",
      entry: entry(transcript, { transcriptStatus: "unsent" }),
      visibleMessages: staged.visibleStagedMessages!,
    });

    expect(initial.stagedEntries.size).toBe(0);
    expect(staged.visibleStagedMessages).toEqual([base, send]);
    expect(staged.stagedEntries.has("transcript")).toBe(false);
    expect(withTranscript.visibleStagedMessages).toEqual([
      base,
      send,
      transcript,
    ]);
    expect(
      withTranscript.stagedEntries.get("transcript")?.transcriptStatus,
    ).toBe("unsent");
  });

  it("keeps an edit's truncated base while stream messages change", () => {
    const base = message("base");
    const edit = message("edit");
    const staged = reduceLangChainThreadState(createLangChainThreadState(), {
      type: "stageEdit",
      entry: entry(edit),
      baseMessages: [base],
    });
    const reconciled = reduceLangChainThreadState(staged, {
      type: "reconcile",
      messages: [base, message("later")],
      visibleMessages: staged.visibleStagedMessages!,
    });

    expect(reconciled.stagedBaseMessages).toEqual([base]);
    expect(reconciled.visibleStagedMessages).toEqual([base, edit]);
  });

  it("matches echoes by id or eligible human content after the base count", () => {
    const base = message("base", "human", "same");
    const first = message("first", "human", [{ type: "text", text: "same" }]);
    const second = message("second", "human", "same");
    const stagedOnce = reduceLangChainThreadState(
      createLangChainThreadState(),
      {
        type: "stage",
        entry: entry(first, { reconcileOnEcho: true, baseMessageCount: 1 }),
        visibleMessages: [base],
      },
    );
    const staged = reduceLangChainThreadState(stagedOnce, {
      type: "stage",
      entry: entry(second, { reconcileOnEcho: true, baseMessageCount: 1 }),
      visibleMessages: stagedOnce.visibleStagedMessages!,
    });
    const rejected = reduceLangChainThreadState(staged, {
      type: "reconcile",
      messages: [base, message("assistant", "ai", "same")],
      visibleMessages: staged.visibleStagedMessages!,
    });
    const matched = reduceLangChainThreadState(rejected, {
      type: "reconcile",
      messages: [base, message("echo", "human", "same"), second],
      visibleMessages: rejected.visibleStagedMessages!,
    });

    expect(rejected.stagedEntries.size).toBe(2);
    expect(matched.stagedEntries.size).toBe(0);
    expect(matched.visibleStagedMessages).toBeNull();
    expect(staged.stagedEntries.size).toBe(2);
  });

  it("does not match content for entries that require an id echo", () => {
    const stagedMessage = message("voice", "human", "spoken");
    const staged = reduceLangChainThreadState(createLangChainThreadState(), {
      type: "stage",
      entry: entry(stagedMessage, { transcriptStatus: "unsent" }),
      visibleMessages: [],
    });
    const noMatch = reduceLangChainThreadState(staged, {
      type: "reconcile",
      messages: [message("other", "human", "spoken")],
      visibleMessages: staged.visibleStagedMessages!,
    });
    const matched = reduceLangChainThreadState(noMatch, {
      type: "reconcile",
      messages: [message("voice", "human", "different")],
      visibleMessages: noMatch.visibleStagedMessages!,
    });

    expect(noMatch.stagedEntries.has("voice")).toBe(true);
    expect(matched.stagedEntries.has("voice")).toBe(false);
  });

  it("reserves transcripts, restores them, and promotes only nontranscripts", () => {
    const voice = message("voice");
    const send = message("send");
    const first = reduceLangChainThreadState(createLangChainThreadState(), {
      type: "stage",
      entry: entry(voice, { transcriptStatus: "unsent" }),
      visibleMessages: [],
    });
    const staged = reduceLangChainThreadState(first, {
      type: "stage",
      entry: entry(send),
      visibleMessages: first.visibleStagedMessages!,
    });
    const sent = reduceLangChainThreadState(staged, {
      type: "markTranscript",
      messages: [voice, send],
      status: "sent",
    });
    const restored = reduceLangChainThreadState(sent, {
      type: "markTranscript",
      messages: [voice],
      status: "unsent",
    });
    const promoted = reduceLangChainThreadState(restored, {
      type: "promote",
      messages: [voice, send],
      visibleMessages: restored.visibleStagedMessages!,
    });

    expect(staged.stagedEntries.get("voice")?.transcriptStatus).toBe("unsent");
    expect(sent.stagedEntries.get("voice")?.transcriptStatus).toBe("sent");
    expect(sent.stagedEntries.get("send")?.transcriptStatus).toBeUndefined();
    expect(promoted.stagedEntries.has("send")).toBe(false);
    expect(promoted.stagedEntries.get("voice")?.transcriptStatus).toBe(
      "unsent",
    );
    expect(promoted.visibleStagedMessages).toEqual([voice]);
  });

  it("removes a failed stage and clears the edit base", () => {
    const stagedMessage = message("failed");
    const staged = reduceLangChainThreadState(createLangChainThreadState(), {
      type: "stageEdit",
      entry: entry(stagedMessage),
      baseMessages: [message("base")],
    });
    const removed = reduceLangChainThreadState(staged, {
      type: "remove",
      id: "failed",
      visibleMessages: staged.visibleStagedMessages!,
    });

    expect(removed.stagedEntries.size).toBe(0);
    expect(removed.stagedBaseMessages).toBeNull();
    expect(removed.visibleStagedMessages).toBeNull();
  });
});
