import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";

describe("LocalThreadRuntimeCore voice teardown", () => {
  it("disconnects without committing an unfinished transcript when detached", async () => {
    const disconnect = vi.fn();
    let emitTranscript!: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect,
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: (callback) => {
        emitTranscript = callback;
        return () => {};
      },
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          voice: { connect: () => session },
          history,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    emitTranscript({ role: "assistant", text: "unfinished" });

    expect(thread.messages).toHaveLength(1);
    expect(history.append).not.toHaveBeenCalled();

    thread.detach();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(thread.voice).toBeUndefined();
    expect(thread.messages).toHaveLength(0);
    expect(thread.export().messages).toHaveLength(0);
    expect(history.append).not.toHaveBeenCalled();
  });
});
