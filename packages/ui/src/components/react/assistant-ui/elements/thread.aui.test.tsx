import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  ExportedMessageRepository,
  type RealtimeVoiceAdapter,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useEffect } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Thread, type ThreadProps } from "./thread.aui";

const adapter: ChatModelAdapter = {
  async *run() {},
};

const createVoiceAdapter = () => {
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    onStatusChange: () => () => {},
    onTranscript: (callback) => {
      transcriptCallback = callback;
      return () => {
        transcriptCallback = undefined;
      };
    },
    onModeChange: () => () => {},
    onVolumeChange: () => () => {},
  };

  return {
    adapter: { connect: () => session },
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) =>
      transcriptCallback?.(transcript),
  } satisfies {
    adapter: RealtimeVoiceAdapter;
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) => void;
  };
};

function TestThread(props: ThreadProps) {
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread {...props} />
    </AssistantRuntimeProvider>
  );
}

const userBranch = (text: string) =>
  ExportedMessageRepository.fromArray([
    { role: "user", content: [{ type: "text", text }] },
  ]).messages;

function UserMessageTestThread() {
  const runtime = useLocalRuntime(adapter);

  useEffect(() => {
    runtime.thread.import({
      messages: [...userBranch("Hello"), ...userBranch("Hello again")],
    });
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

function FeedbackTestThread({ submit }: { submit?: () => void }) {
  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      {
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
        status: { type: "complete", reason: "stop" },
      },
    ],
    ...(submit ? { adapters: { feedback: { submit } } } : {}),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

function VoiceRuntimeAccess({
  onReady,
}: {
  onReady: (aui: ReturnType<typeof useAui>) => void;
}) {
  onReady(useAui());
  return null;
}

function VoiceTestThread({
  voice,
  onReady,
}: {
  voice: RealtimeVoiceAdapter;
  onReady: (aui: ReturnType<typeof useAui>) => void;
}) {
  const runtime = useLocalRuntime(adapter, { adapters: { voice } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VoiceRuntimeAccess onReady={onReady} />
      <Thread />
    </AssistantRuntimeProvider>
  );
}

const renderVoiceThread = () => {
  const voice = createVoiceAdapter();
  let aui: ReturnType<typeof useAui> | undefined;

  render(
    <VoiceTestThread
      voice={voice.adapter}
      onReady={(nextAui) => {
        aui = nextAui;
      }}
    />,
  );

  if (aui === undefined) throw new Error("Runtime was not initialized");
  return { aui, voice };
};

beforeAll(() => {
  HTMLElement.prototype.scrollTo ??= () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(async () => {
  await act(async () => {
    cleanup();
  });
  document.body.replaceChildren();
});

describe("Thread", () => {
  it("focuses the composer by default", async () => {
    render(<TestThread />);

    const composer = screen.getByRole("textbox");
    await waitFor(() => expect(document.activeElement).toBe(composer));
  });

  it("keeps the page focus when autoFocus is false", () => {
    const pageControl = document.body.appendChild(
      document.createElement("button"),
    );
    pageControl.focus();

    render(<TestThread autoFocus={false} />);

    expect(document.activeElement).toBe(pageControl);
  });

  it("hides the empty user attachment wrapper", async () => {
    render(<UserMessageTestThread />);

    await waitFor(() => expect(screen.getByText("Hello again")).toBeTruthy());

    const root = document.querySelector('[data-slot="aui_user-message-root"]');
    const attachments = root?.querySelector(
      ".aui-user-message-attachments-end",
    );

    expect(attachments).toBeTruthy();
    expect(attachments?.matches(":empty")).toBe(true);
    expect(attachments?.classList.contains("empty:hidden")).toBe(true);
  });

  it("lets the user branch picker follow the rendered rows", async () => {
    render(<UserMessageTestThread />);

    const picker = await waitFor(() => {
      const element = document.querySelector(
        '[data-slot="aui_user-branch-picker"]',
      );
      expect(element).toBeTruthy();
      return element as HTMLElement;
    });

    expect(picker.classList.contains("col-span-full")).toBe(true);
    expect(picker.className).not.toMatch(/row-start-/);
  });

  it("shows feedback actions only when the runtime supports feedback", () => {
    const { unmount } = render(<FeedbackTestThread />);

    expect(screen.queryByRole("button", { name: "Helpful" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Not helpful" })).toBeNull();

    unmount();
    render(<FeedbackTestThread submit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Helpful" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not helpful" })).toBeTruthy();
  });

  it("submits the rating through the feedback adapter", () => {
    const submit = vi.fn();
    render(<FeedbackTestThread submit={submit} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));
    });

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "negative" }),
    );
  });

  it("groups final voice transcripts into spoken rows", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Hello", isFinal: true });
      voice.emitTranscript({
        role: "assistant",
        text: "Hi there",
        isFinal: true,
      });
      await Promise.resolve();
    });

    const spokenMessages = document.querySelectorAll<HTMLElement>(
      '[data-slot="aui_spoken-message-root"]',
    );
    expect(spokenMessages).toHaveLength(2);
    expect(spokenMessages[0]?.getAttribute("data-voice-run")).toBe("start");
    expect(spokenMessages[1]?.getAttribute("data-voice-run")).toBe("end");
    expect(
      document.querySelectorAll('[data-slot="aui_spoken-exchange-header"]'),
    ).toHaveLength(1);
    expect(
      within(spokenMessages[0]!)
        .getByText("You said")
        .classList.contains("sr-only"),
    ).toBe(true);
    expect(
      within(spokenMessages[1]!)
        .getByText("Assistant said")
        .classList.contains("sr-only"),
    ).toBe(true);

    for (const spokenMessage of spokenMessages) {
      expect(
        within(spokenMessage).queryByRole("button", { name: "Edit" }),
      ).toBeNull();
      expect(
        within(spokenMessage).queryByRole("button", { name: "Refresh" }),
      ).toBeNull();
    }
  });

  it("marks a single final voice transcript as a single spoken row", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Hello", isFinal: true });
      await Promise.resolve();
    });

    const [spokenMessage] = document.querySelectorAll<HTMLElement>(
      '[data-slot="aui_spoken-message-root"]',
    );
    expect(spokenMessage?.getAttribute("data-voice-run")).toBe("single");
  });

  it("shows the speaking indicator for a partial assistant transcript", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "assistant", text: "Hi", isFinal: false });
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Assistant is speaking")).toBeTruthy();
  });

  it("keeps the send button instead of stop while a spoken reply is in progress", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "assistant", text: "Hi", isFinal: false });
      await Promise.resolve();
    });

    expect(aui.thread.getState().isRunning).toBe(true);
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Stop generating" }),
    ).toBeNull();
  });

  it("marks the middle of a three-turn voice run", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Hello", isFinal: true });
      voice.emitTranscript({
        role: "assistant",
        text: "Hi there",
        isFinal: true,
      });
      voice.emitTranscript({ role: "user", text: "Thanks", isFinal: true });
      await Promise.resolve();
    });

    const positions = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="aui_spoken-message-root"]',
      ),
    ].map((row) => row.getAttribute("data-voice-run"));
    expect(positions).toEqual(["start", "middle", "end"]);
    expect(
      document.querySelectorAll('[data-slot="aui_spoken-exchange-header"]'),
    ).toHaveLength(1);
  });

  it("starts a new voice conversation block after a typed message", async () => {
    const { aui, voice } = renderVoiceThread();

    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Hello", isFinal: true });
      voice.emitTranscript({
        role: "assistant",
        text: "Hi there",
        isFinal: true,
      });
      await Promise.resolve();
    });
    await act(async () => {
      aui.thread.disconnectVoice();
      await Promise.resolve();
    });
    await act(async () => {
      await aui.thread.append({
        role: "user",
        content: [{ type: "text", text: "Typed follow up" }],
      });
    });
    await waitFor(() => {
      const state = aui.thread.getState();
      expect(state.messages).toHaveLength(4);
      expect(state.isRunning).toBe(false);
    });
    await act(async () => {
      aui.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Back", isFinal: true });
      voice.emitTranscript({
        role: "assistant",
        text: "Welcome back",
        isFinal: true,
      });
      await Promise.resolve();
    });

    const positions = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="aui_spoken-message-root"]',
      ),
    ].map((row) => row.getAttribute("data-voice-run"));
    expect(positions).toEqual(["start", "end", "start", "end"]);
    expect(
      document.querySelectorAll('[data-slot="aui_spoken-exchange-header"]'),
    ).toHaveLength(2);
  });
});
