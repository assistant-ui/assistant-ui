import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type RealtimeVoiceAdapter,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
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
});
