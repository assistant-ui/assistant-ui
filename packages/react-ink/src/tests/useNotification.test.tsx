import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import type { ComposerState, MessageState } from "@assistant-ui/core/store";
import type { UseAuiStateSelector } from "./helpers";

const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

import {
  ringBell,
  sendOSCNotification,
  useNotification,
  type NotificationConfig,
} from "../index";

type ThreadSnapshot = {
  isRunning: boolean;
  messages: MessageState[];
};

let snapshot: ThreadSnapshot = { isRunning: false, messages: [] };

const composer: ComposerState = {
  text: "",
  role: "user",
  attachments: [],
  runConfig: {},
  isEditing: false,
  canCancel: false,
  canSend: false,
  attachmentAccept: "",
  isEmpty: true,
  type: "thread",
  dictation: undefined,
  quote: undefined,
  queue: [],
};

const makeAssistantMessage = (
  id: string,
  status: MessageState["status"],
): MessageState =>
  ({
    role: "assistant",
    id,
    status,
    createdAt: new Date(0),
    parentId: null,
    isLast: true,
    branchNumber: 0,
    branchCount: 1,
    speech: undefined,
    submittedFeedback: undefined,
    composer,
    parts: [],
    isCopied: false,
    isHovering: false,
    index: 0,
    content: [],
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as unknown as MessageState;

const Notifier = ({ config }: { config?: NotificationConfig }) => {
  useNotification(config);
  return null;
};

const renderNotifier = (node: ReactElement = <Notifier />) => render(node);
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  snapshot = { isRunning: false, messages: [] };
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({
      thread: snapshot,
      threadListItem: { id: "thread-1" },
    } as never),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("notification channels", () => {
  const spyStdout = () =>
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  it("ringBell writes BEL", () => {
    const w = spyStdout();
    ringBell();
    expect(w).toHaveBeenCalledWith("\x07");
    w.mockRestore();
  });

  it.each([
    ["osc9", "\x1b]9;body\x07"],
    ["osc99", "\x1b]99;i=1:d=0;body\x1b\\"],
    ["osc777", "\x1b]777;notify;title;body\x07"],
  ] as const)("sendOSCNotification writes %s sequence", (variant, expected) => {
    const w = spyStdout();
    sendOSCNotification("title", "body", variant);
    expect(w).toHaveBeenCalledWith(expected);
    w.mockRestore();
  });

  it.each([
    ["osc9", "\x1b]9;body\x07"],
    ["osc99", "\x1b]99;i=1:d=0;body\x1b\\"],
    ["osc777", "\x1b]777;notify;title;body\x07"],
  ] as const)(
    "sendOSCNotification strips ESC and BEL in %s",
    (variant, expected) => {
      const w = spyStdout();
      sendOSCNotification("ti\x1btle", "bo\x07dy\x1b", variant);
      expect(w).toHaveBeenCalledWith(expected);
      w.mockRestore();
    },
  );
});

describe("useNotification", () => {
  const spyStdout = () =>
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  it("rings bell and emits OSC after a run completes", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier />);
    await flush();

    expect(w).toHaveBeenNthCalledWith(1, "\x07");
    expect(w).toHaveBeenNthCalledWith(2, "\x1b]9;AI task complete\x07");
    w.mockRestore();
  });

  it("rings bell once when a run ends incomplete", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "incomplete", reason: "error" }),
      ],
    };
    instance.rerender(<Notifier />);
    await flush();

    expect(w).toHaveBeenCalledTimes(1);
    expect(w).toHaveBeenCalledWith("\x07");
    w.mockRestore();
  });

  it("does not fire when mounted on an already-complete thread", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();
    instance.rerender(<Notifier />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("fires when mounted mid-run and the run later completes", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier />);
    await flush();

    expect(w).toHaveBeenCalledTimes(2);
    w.mockRestore();
  });

  it("emits needs-input on requires-action with reason interrupt", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "interrupt",
        }),
      ],
    };
    const w = spyStdout();

    renderNotifier();
    await flush();

    expect(w).toHaveBeenCalledTimes(1);
    expect(w).toHaveBeenCalledWith("\x07");
    w.mockRestore();
  });

  it("ignores requires-action with reason tool-calls", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "tool-calls",
        }),
      ],
    };
    const w = spyStdout();

    renderNotifier();
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("re-fires needs-input when a message re-enters interrupt", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "interrupt",
        }),
      ],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    instance.rerender(<Notifier />);
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "interrupt",
        }),
      ],
    };
    instance.rerender(<Notifier />);
    await flush();

    expect(w).toHaveBeenCalledTimes(2);
    w.mockRestore();
  });

  it("dedupes a stable status across rerenders", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier />);
    await flush();
    instance.rerender(<Notifier />);
    await flush();

    expect(w).toHaveBeenCalledTimes(2);
    w.mockRestore();
  });

  it("does nothing when enabled is false", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier(<Notifier config={{ enabled: false }} />);
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier config={{ enabled: false }} />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("does not fire a completion notification after switching to a different thread mid-run", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("mA", { type: "running" })],
    };
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        thread: snapshot,
        threadListItem: { id: "thread-A" },
      } as never),
    );
    const w = spyStdout();

    const instance = renderNotifier();
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("mB", { type: "complete", reason: "stop" }),
      ],
    };
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        thread: snapshot,
        threadListItem: { id: "thread-B" },
      } as never),
    );
    instance.rerender(<Notifier />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("does not emit a stale needs-input after re-enabling", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "interrupt",
        }),
      ],
    };
    const w = spyStdout();

    const instance = renderNotifier(<Notifier config={{ enabled: false }} />);
    await flush();

    instance.rerender(<Notifier config={{ enabled: true }} />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("does not emit a stale completion after re-enabling", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier(<Notifier config={{ enabled: false }} />);
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier config={{ enabled: false }} />);
    await flush();

    instance.rerender(<Notifier config={{ enabled: true }} />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });

  it("calls a custom handler with event details", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();
    const custom = vi.fn();

    const instance = renderNotifier(
      <Notifier
        config={{
          onTaskComplete: { custom },
          onTaskIncomplete: false,
          onNeedsInput: false,
        }}
      />,
    );
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(
      <Notifier
        config={{
          onTaskComplete: { custom },
          onTaskIncomplete: false,
          onNeedsInput: false,
        }}
      />,
    );
    await flush();

    expect(w).not.toHaveBeenCalled();
    expect(custom).toHaveBeenCalledWith({
      type: "task-complete",
      threadId: "thread-1",
      messageId: "m1",
      title: "AI task complete",
    });
    w.mockRestore();
  });

  it("calls onTaskIncomplete.custom with the incomplete reason", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();
    const custom = vi.fn();

    const instance = renderNotifier(
      <Notifier
        config={{
          onTaskComplete: false,
          onTaskIncomplete: { custom },
          onNeedsInput: false,
        }}
      />,
    );
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "incomplete", reason: "error" }),
      ],
    };
    instance.rerender(
      <Notifier
        config={{
          onTaskComplete: false,
          onTaskIncomplete: { custom },
          onNeedsInput: false,
        }}
      />,
    );
    await flush();

    expect(w).not.toHaveBeenCalled();
    expect(custom).toHaveBeenCalledWith({
      type: "task-incomplete",
      threadId: "thread-1",
      messageId: "m1",
      title: "AI task stopped",
      reason: "error",
    });
    w.mockRestore();
  });

  it("calls onNeedsInput.custom with reason interrupt", async () => {
    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", {
          type: "requires-action",
          reason: "interrupt",
        }),
      ],
    };
    const w = spyStdout();
    const custom = vi.fn();

    renderNotifier(
      <Notifier
        config={{
          onTaskComplete: false,
          onTaskIncomplete: false,
          onNeedsInput: { custom },
        }}
      />,
    );
    await flush();

    expect(w).not.toHaveBeenCalled();
    expect(custom).toHaveBeenCalledWith({
      type: "needs-input",
      threadId: "thread-1",
      messageId: "m1",
      title: "AI needs input",
      reason: "interrupt",
    });
    w.mockRestore();
  });

  it("suppresses a single key when set to false", async () => {
    snapshot = {
      isRunning: true,
      messages: [makeAssistantMessage("m1", { type: "running" })],
    };
    const w = spyStdout();

    const instance = renderNotifier(
      <Notifier config={{ onTaskComplete: false }} />,
    );
    await flush();

    snapshot = {
      isRunning: false,
      messages: [
        makeAssistantMessage("m1", { type: "complete", reason: "stop" }),
      ],
    };
    instance.rerender(<Notifier config={{ onTaskComplete: false }} />);
    await flush();

    expect(w).not.toHaveBeenCalled();
    w.mockRestore();
  });
});
