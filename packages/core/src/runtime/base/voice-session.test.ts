import { describe, expect, it, vi } from "vitest";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import { VoiceSessionController } from "./voice-session";

const createHarness = () => {
  const sessions: Array<{
    session: RealtimeVoiceAdapter.Session;
    emitStatus: (status: RealtimeVoiceAdapter.Status) => void;
    emitVolume: (volume: number) => void;
    emitTranscript: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
  }> = [];
  const adapter: RealtimeVoiceAdapter = {
    connect: () => {
      const statuses = new Set<(status: RealtimeVoiceAdapter.Status) => void>();
      const volumes = new Set<(volume: number) => void>();
      const transcripts = new Set<
        (item: RealtimeVoiceAdapter.TranscriptItem) => void
      >();
      const subscribe =
        <T>(listeners: Set<(value: T) => void>) =>
        (callback: (value: T) => void) => {
          listeners.add(callback);
          return () => listeners.delete(callback);
        };
      const session: RealtimeVoiceAdapter.Session = {
        status: { type: "running" },
        isMuted: false,
        disconnect: vi.fn(),
        mute: vi.fn(),
        unmute: vi.fn(),
        onStatusChange: subscribe(statuses),
        onVolumeChange: subscribe(volumes),
        onTranscript: subscribe(transcripts),
        onModeChange: () => () => {},
      };
      sessions.push({
        session,
        emitStatus: (status) => {
          session.status = status;
          for (const callback of [...statuses]) callback(status);
        },
        emitVolume: (volume) => {
          for (const callback of [...volumes]) callback(volume);
        },
        emitTranscript: (item) => {
          for (const callback of [...transcripts]) callback(item);
        },
      });
      return session;
    },
  };
  const notify = vi.fn();
  const onConnected = vi.fn();
  const onDisconnected = vi.fn();
  const commitVoiceMessage = vi.fn();
  const host: ConstructorParameters<typeof VoiceSessionController>[0] = {
    adapter: () => adapter,
    isRunning: () => false,
    isRunActive: () => false,
    isLoading: () => false,
    getBaseMessages: () => [],
    messages: () => controller.getMessages(),
    state: () => null,
    notify,
    subscribe: () => () => {},
    captureGeneration: () => new AbortController().signal,
    ensureInitialized: () => {},
    commitVoiceMessage,
    markVoiceMessagesDirty: () => controller.markMessagesDirty(),
    onConnected,
    onDisconnected,
    enrichAppendMetadata: (message) => message,
    resolveAppendParent: (parentId) => parentId,
    stopSpeakingForVoiceMessage: () => undefined,
  };
  const controller = new VoiceSessionController(host);
  return {
    controller,
    sessions,
    notify,
    onConnected,
    onDisconnected,
    commitVoiceMessage,
  };
};

describe("VoiceSessionController", () => {
  it("connects and replaces a session while ignoring its stale events", () => {
    const { controller, sessions, onConnected, onDisconnected } =
      createHarness();
    controller.connectVoice();
    const first = sessions[0]!;
    expect(controller.voice?.status.type).toBe("running");
    expect(onConnected).toHaveBeenCalledOnce();

    first.emitVolume(0.7);
    controller.connectVoice();
    expect(first.session.disconnect).toHaveBeenCalledOnce();
    expect(sessions).toHaveLength(2);
    expect(controller.getVoiceVolume()).toBe(0);
    first.emitStatus({ type: "ended", reason: "finished" });
    first.emitTranscript({ role: "user", text: "stale", isFinal: true });
    expect(controller.voice?.status.type).toBe("running");
    expect(controller.getMessages()).toEqual([]);
    expect(onConnected).toHaveBeenCalledTimes(2);
    expect(onDisconnected).not.toHaveBeenCalled();
  });

  it("resets volume and finishes a partial reply when a session ends", () => {
    const { controller, sessions, onDisconnected, commitVoiceMessage } =
      createHarness();
    const onVolume = vi.fn();
    controller.subscribeVoiceVolume(onVolume);
    controller.connectVoice();
    const first = sessions[0]!;
    first.emitTranscript({ role: "assistant", text: "partial" });
    first.emitVolume(0.8);
    const volumeNotifications = onVolume.mock.calls.length;
    first.emitStatus({ type: "ended", reason: "finished" });

    expect(controller.voice).toBeUndefined();
    expect(controller.getVoiceVolume()).toBe(0);
    expect(onVolume).toHaveBeenCalledTimes(volumeNotifications + 1);
    expect(onDisconnected).toHaveBeenCalledOnce();
    expect(controller.getMessages()[0]?.status).toEqual({
      type: "complete",
      reason: "stop",
    });
    expect(commitVoiceMessage).toHaveBeenCalledOnce();
  });

  it("discards a transcript and invalidates the merged messages", () => {
    const { controller, sessions, notify } = createHarness();
    controller.connectVoice();
    sessions[0]!.emitTranscript({ role: "assistant", text: "partial" });
    const messageId = controller.getMessages()[0]!.id;
    const generation = controller.voiceGeneration;
    const notifications = notify.mock.calls.length;
    controller.dropMessage(messageId, true);

    expect(controller.getMessages()).toEqual([]);
    expect(controller.voiceGeneration).toBe(generation + 1);
    expect(notify).toHaveBeenCalledTimes(notifications + 1);
  });
});
