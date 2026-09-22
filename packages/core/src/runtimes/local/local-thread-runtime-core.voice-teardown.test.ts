import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";

describe("LocalThreadRuntimeCore voice teardown", () => {
  it("disconnects the provider session when the thread is detached", () => {
    const disconnect = vi.fn();
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect,
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: () => () => {},
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          voice: { connect: () => session },
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    thread.connectVoice();

    thread.detach();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(thread.voice).toBeUndefined();
  });
});
