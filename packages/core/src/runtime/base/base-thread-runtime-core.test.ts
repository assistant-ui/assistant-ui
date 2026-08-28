import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { AppendMessage } from "../../types/message";
import type {
  AddToolResultOptions,
  ResumeRunConfig,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  RuntimeCapabilities,
  StartRunConfig,
  ThreadSuggestion,
} from "../interfaces/thread-runtime-core";
import { BaseThreadRuntimeCore } from "./base-thread-runtime-core";

const createVoiceAdapter = () => {
  let volumeCallback: ((volume: number) => void) | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    onStatusChange: () => () => {},
    onTranscript: () => () => {},
    onModeChange: () => () => {},
    onVolumeChange: (callback) => {
      volumeCallback = callback;
      return () => {
        volumeCallback = undefined;
      };
    },
  };

  return {
    adapter: { connect: () => session },
    emitVolume: (volume: number) => volumeCallback?.(volume),
    session,
  } satisfies {
    adapter: RealtimeVoiceAdapter;
    emitVolume: (volume: number) => void;
    session: RealtimeVoiceAdapter.Session;
  };
};

class TestRuntime extends BaseThreadRuntimeCore {
  private readonly voiceAdapter: ReturnType<typeof createVoiceAdapter>;

  constructor(voiceAdapter: ReturnType<typeof createVoiceAdapter>) {
    super({ getModelContext: () => ({}) });
    this.voiceAdapter = voiceAdapter;
  }

  get adapters() {
    return { voice: this.voiceAdapter.adapter };
  }

  get isDisabled() {
    return false;
  }

  get isSendDisabled() {
    return false;
  }

  get isLoading() {
    return false;
  }

  get suggestions(): readonly ThreadSuggestion[] {
    return [];
  }

  get extras() {
    return undefined;
  }

  get capabilities(): RuntimeCapabilities {
    return {
      switchToBranch: false,
      switchBranchDuringRun: false,
      edit: false,
      delete: false,
      reload: false,
      refetchThread: false,
      cancel: false,
      unstable_copy: false,
      speech: false,
      dictation: false,
      voice: true,
      attachments: false,
      feedback: false,
      queue: false,
    };
  }

  append(_message: AppendMessage) {}
  deleteMessage(_messageId: string) {}
  startRun(_config: StartRunConfig) {}
  resumeRun(_config: ResumeRunConfig) {}
  addToolResult(_options: AddToolResultOptions) {}
  resumeToolCall(_options: ResumeToolCallOptions) {}
  respondToToolApproval(_options: RespondToToolApprovalOptions) {}
  cancelRun() {}
  exportExternalState() {
    return {};
  }
  importExternalState(_state: unknown) {}
  unstable_notifySessionReset() {}
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaseThreadRuntimeCore subscriptions", () => {
  it("notifies later subscribers when an earlier subscriber throws", () => {
    const runtime = new TestRuntime(createVoiceAdapter());
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    runtime.subscribe(() => {
      throw error;
    });
    runtime.subscribe(laterSubscriber);

    expect(() => runtime.reset()).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
  });
});

describe("BaseThreadRuntimeCore voice volume subscriptions", () => {
  it("continues notifying subscribers when one throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(() => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    expect(() => voice.emitVolume(0.5)).not.toThrow();
    expect(laterListener).toHaveBeenCalledOnce();
    expect(runtime.getVoiceVolume()).toBe(0.5);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice volume listener threw an error",
      listenerError,
    );
  });

  it("continues disconnect cleanup when a subscriber throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("disconnect listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(() => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    expect(() => runtime.disconnectVoice()).not.toThrow();
    expect(laterListener).toHaveBeenCalledOnce();
    expect(runtime.getVoiceVolume()).toBe(0);
    expect(runtime.voice).toBeUndefined();
    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice volume listener threw an error",
      listenerError,
    );
  });

  it("reports rejected subscriber thenables", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const voice = createVoiceAdapter();
    const runtime = new TestRuntime(voice);
    runtime.connectVoice();

    const listenerError = new Error("async listener failed");
    const laterListener = vi.fn();
    runtime.subscribeVoiceVolume(async () => {
      throw listenerError;
    });
    runtime.subscribeVoiceVolume(laterListener);

    voice.emitVolume(0.5);

    await vi.waitFor(() => {
      expect(laterListener).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Voice volume listener threw an error",
        listenerError,
      );
    });
  });
});
