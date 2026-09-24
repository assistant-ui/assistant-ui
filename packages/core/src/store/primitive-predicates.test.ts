import { describe, expect, it } from "vitest";
import {
  actionBarCopyDisabled,
  actionBarEditDisabled,
  actionBarReloadDisabled,
  actionBarSpeakDisabled,
  branchPickerNextDisabled,
  branchPickerPreviousDisabled,
  composerCancelDisabled,
  composerInputDisabled,
  composerSendDisabled,
  suggestionSendMode,
  suggestionTriggerDisabled,
} from "./primitive-predicates";

const state = (partial: Record<string, unknown>) => partial as never;

describe("primitive predicates", () => {
  it("composerSendDisabled requires canSend and either an idle thread or a queue", () => {
    const composer = { canSend: true };
    expect(
      composerSendDisabled(
        state({
          composer,
          thread: { isRunning: false, capabilities: { queue: false } },
        }),
      ),
    ).toBe(false);
    expect(
      composerSendDisabled(
        state({
          composer,
          thread: { isRunning: true, capabilities: { queue: true } },
        }),
      ),
    ).toBe(false);
    expect(
      composerSendDisabled(
        state({
          composer,
          thread: { isRunning: true, capabilities: { queue: false } },
        }),
      ),
    ).toBe(true);
    expect(
      composerSendDisabled(
        state({
          composer: { canSend: false },
          thread: { isRunning: false, capabilities: { queue: false } },
        }),
      ),
    ).toBe(true);
  });

  it("composerSendDisabled leaves a spoken reply in progress to canSend while a voice session is connected", () => {
    const voice = { status: { type: "running" }, canSendText: true };
    expect(
      composerSendDisabled(
        state({
          composer: { canSend: true },
          thread: { isRunning: true, capabilities: { queue: false }, voice },
        }),
      ),
    ).toBe(false);
    expect(
      composerSendDisabled(
        state({
          composer: { canSend: false },
          thread: { isRunning: true, capabilities: { queue: false }, voice },
        }),
      ),
    ).toBe(true);
  });

  it("actionBarReloadDisabled rejects user messages, busy threads, and runtimes without reload", () => {
    const thread = {
      isRunning: false,
      isDisabled: false,
      capabilities: { reload: true },
    };
    expect(
      actionBarReloadDisabled(
        state({ thread, message: { role: "assistant" } }),
      ),
    ).toBe(false);
    expect(
      actionBarReloadDisabled(
        state({
          thread: { ...thread, voice: {} },
          message: { role: "assistant" },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarReloadDisabled(state({ thread, message: { role: "user" } })),
    ).toBe(true);
    expect(
      actionBarReloadDisabled(
        state({
          thread: { ...thread, isRunning: true },
          message: { role: "assistant" },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarReloadDisabled(
        state({
          thread: { ...thread, capabilities: { reload: false } },
          message: { role: "assistant" },
        }),
      ),
    ).toBe(true);
  });

  it("actionBarCopyDisabled requires settled content with non-empty text", () => {
    expect(
      actionBarCopyDisabled(
        state({
          message: {
            role: "assistant",
            status: { type: "complete" },
            parts: [{ type: "text", text: "hi" }],
          },
        }),
      ),
    ).toBe(false);
    expect(
      actionBarCopyDisabled(
        state({
          message: {
            role: "assistant",
            status: { type: "running" },
            parts: [{ type: "text", text: "hi" }],
          },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarCopyDisabled(
        state({
          message: {
            role: "user",
            status: undefined,
            parts: [{ type: "text", text: "" }],
          },
        }),
      ),
    ).toBe(true);
  });

  it("actionBarSpeakDisabled also requires speech support", () => {
    const message = {
      role: "assistant",
      status: { type: "complete" },
      parts: [{ type: "text", text: "hi" }],
    };
    expect(
      actionBarSpeakDisabled(
        state({
          optional: { thread: { capabilities: { speech: true } } },
          message,
        }),
      ),
    ).toBe(false);
    expect(
      actionBarSpeakDisabled(
        state({
          optional: { thread: { capabilities: { speech: false } } },
          message,
        }),
      ),
    ).toBe(true);
    expect(
      actionBarSpeakDisabled(
        state({ optional: { thread: undefined }, message }),
      ),
    ).toBe(true);
  });

  it("branch picker predicates respect bounds and run capabilities", () => {
    const thread = {
      isRunning: false,
      capabilities: { switchToBranch: true, switchBranchDuringRun: false },
    };
    const message = { branchNumber: 2, branchCount: 3 };
    expect(branchPickerPreviousDisabled(state({ thread, message }))).toBe(
      false,
    );
    expect(branchPickerNextDisabled(state({ thread, message }))).toBe(false);
    expect(
      branchPickerPreviousDisabled(
        state({ thread, message: { ...message, branchNumber: 1 } }),
      ),
    ).toBe(true);
    expect(
      branchPickerNextDisabled(
        state({ thread, message: { ...message, branchNumber: 3 } }),
      ),
    ).toBe(true);
    expect(
      branchPickerNextDisabled(
        state({ thread: { ...thread, isRunning: true }, message }),
      ),
    ).toBe(true);
    const noSwitching = {
      ...thread,
      capabilities: { ...thread.capabilities, switchToBranch: false },
    };
    expect(
      branchPickerPreviousDisabled(state({ thread: noSwitching, message })),
    ).toBe(true);
    expect(
      branchPickerNextDisabled(state({ thread: noSwitching, message })),
    ).toBe(true);
  });

  it("suggestionTriggerDisabled gates on send only for queueless runs", () => {
    const thread = {
      isDisabled: false,
      isRunning: true,
      capabilities: { queue: false },
    };
    expect(suggestionTriggerDisabled(state({ thread }), false)).toBe(false);
    expect(suggestionTriggerDisabled(state({ thread }), true)).toBe(true);
    expect(
      suggestionTriggerDisabled(
        state({ thread: { ...thread, capabilities: { queue: true } } }),
        true,
      ),
    ).toBe(false);
  });

  it("suggestionTriggerDisabled follows canSendText instead of the run while a voice session is connected", () => {
    const thread = {
      isDisabled: false,
      isRunning: true,
      capabilities: { queue: false },
    };
    expect(
      suggestionTriggerDisabled(
        state({ thread: { ...thread, voice: { canSendText: true } } }),
        true,
      ),
    ).toBe(false);
    expect(
      suggestionTriggerDisabled(
        state({
          thread: {
            ...thread,
            isRunning: false,
            voice: { canSendText: false },
          },
        }),
        true,
      ),
    ).toBe(true);
    expect(
      suggestionTriggerDisabled(
        state({ thread: { ...thread, voice: { canSendText: false } } }),
        false,
      ),
    ).toBe(false);
  });

  it("suggestionSendMode queues only a text run with queue support", () => {
    const idle = { isRunning: false, capabilities: { queue: false } };
    expect(suggestionSendMode(state(idle))).toBe("now");
    expect(suggestionSendMode(state({ ...idle, isRunning: true }))).toBe(
      "blocked",
    );
    expect(
      suggestionSendMode(
        state({ isRunning: true, capabilities: { queue: true } }),
      ),
    ).toBe("queued");
    expect(
      suggestionSendMode(
        state({
          isRunning: true,
          capabilities: { queue: true },
          voice: { canSendText: true },
        }),
      ),
    ).toBe("now");
    expect(
      suggestionSendMode(
        state({
          isRunning: false,
          capabilities: { queue: true },
          voice: { canSendText: false },
        }),
      ),
    ).toBe("blocked");
  });
  it("composerCancelDisabled, composerInputDisabled, and actionBarEditDisabled mirror their fields", () => {
    expect(
      composerCancelDisabled(state({ composer: { canCancel: true } })),
    ).toBe(false);
    expect(
      composerCancelDisabled(state({ composer: { canCancel: false } })),
    ).toBe(true);

    const enabledThread = { isDisabled: false };
    expect(
      composerInputDisabled(state({ thread: enabledThread, composer: {} })),
    ).toBe(false);
    expect(
      composerInputDisabled(
        state({
          thread: enabledThread,
          composer: { dictation: { inputDisabled: true } },
        }),
      ),
    ).toBe(true);
    expect(
      composerInputDisabled(
        state({ thread: { isDisabled: true }, composer: {} }),
      ),
    ).toBe(true);

    const editable = { optional: { thread: { capabilities: { edit: true } } } };
    expect(
      actionBarEditDisabled(
        state({ ...editable, composer: { isEditing: false } }),
      ),
    ).toBe(false);
    expect(
      actionBarEditDisabled(
        state({
          optional: { thread: { capabilities: { edit: true }, voice: {} } },
          composer: { isEditing: false },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarEditDisabled(
        state({ ...editable, composer: { isEditing: true } }),
      ),
    ).toBe(true);
    expect(
      actionBarEditDisabled(
        state({
          optional: { thread: { capabilities: { edit: false } } },
          composer: { isEditing: false },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarEditDisabled(
        state({
          optional: { thread: undefined },
          composer: { isEditing: false },
        }),
      ),
    ).toBe(false);
    expect(
      actionBarEditDisabled(
        state({
          optional: { ...editable.optional, message: { submission: {} } },
          composer: { isEditing: false },
        }),
      ),
    ).toBe(true);
    expect(
      actionBarEditDisabled(
        state({
          optional: {
            ...editable.optional,
            message: { submission: undefined },
          },
          composer: { isEditing: false },
        }),
      ),
    ).toBe(false);
  });
});
