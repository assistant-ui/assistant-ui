import { describe, expect, it, vi } from "vitest";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { ModelContextProvider } from "../../model-context/types";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const modelContextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const interaction: Unstable_RecordToolInteractionOptions = {
  messageId: "message-1",
  toolCallId: "call-1",
  interaction: {
    type: "action",
    payload: { action: "toggle" },
    occurredAt: 0,
  },
};

const createRuntime = (overrides: Partial<ExternalStoreAdapter> = {}) =>
  new ExternalStoreThreadRuntimeCore(modelContextProvider, {
    messages: [],
    onNew: async () => {},
    ...overrides,
  } as ExternalStoreAdapter);

const createVoiceAdapter = () => {
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const statusCleanup = vi.fn();
  const transcriptCleanup = vi.fn();
  const modeCleanup = vi.fn();
  const volumeCleanup = vi.fn();
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    onStatusChange: () => statusCleanup,
    onTranscript: (callback) => {
      transcriptCallback = callback;
      return () => {
        transcriptCleanup();
        transcriptCallback = undefined;
      };
    },
    onModeChange: () => modeCleanup,
    onVolumeChange: () => volumeCleanup,
  };
  return {
    adapter: { connect: vi.fn(() => session) },
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) =>
      transcriptCallback?.(transcript),
    session,
    cleanups: [statusCleanup, transcriptCleanup, modeCleanup, volumeCleanup],
  };
};

describe("ExternalStoreThreadRuntimeCore interaction recording", () => {
  it("delegates interaction records to the adapter", async () => {
    const onRecordToolInteraction = vi.fn(async () => {});
    const runtime = createRuntime({
      unstable_onRecordToolInteraction: onRecordToolInteraction,
    });

    await runtime.unstable_recordToolInteraction(interaction);

    expect(onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith(
      interaction,
    );
  });

  it("rejects when the adapter does not record interactions", async () => {
    const runtime = createRuntime();

    await expect(
      runtime.unstable_recordToolInteraction(interaction),
    ).rejects.toThrow("Runtime does not support recording tool interactions.");
  });
});

describe("ExternalStoreThreadRuntimeCore voice transcripts", () => {
  it("disconnects when the host transcript callback throws synchronously", () => {
    const commitError = new Error("host store rejected the transcript");
    const voice = createVoiceAdapter();
    const runtime = createRuntime({
      adapters: { voice: voice.adapter },
      onVoiceTranscript: () => {
        throw commitError;
      },
    });
    runtime.connectVoice();
    voice.emitTranscript({
      role: "assistant",
      text: "Partial",
      isFinal: false,
    });

    expect(() => runtime.disconnectVoice()).toThrow(commitError);

    expect(voice.session.disconnect).toHaveBeenCalledOnce();
    expect(
      voice.cleanups.every((cleanup) => cleanup.mock.calls.length === 1),
    ).toBe(true);
    expect(runtime.voice).toBeUndefined();
  });
});
