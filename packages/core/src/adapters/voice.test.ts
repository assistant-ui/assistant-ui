import { afterEach, describe, expect, it, vi } from "vitest";
import { createVoiceSession, type VoiceSessionHelpers } from "./voice";

const createTestSession = () => {
  let helpers: VoiceSessionHelpers | undefined;
  const session = createVoiceSession({}, async (sessionHelpers) => {
    helpers = sessionHelpers;
    return {
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    };
  });

  if (!helpers) throw new Error("Voice session setup did not start");
  return { helpers, session };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createVoiceSession", () => {
  it("continues notifying listeners when one throws", () => {
    const listenerError = new Error("listener failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { helpers, session } = createTestSession();

    const transcriptListener = vi.fn();
    session.onTranscript(() => {
      throw listenerError;
    });
    session.onTranscript(transcriptListener);

    const modeListener = vi.fn();
    session.onModeChange(() => {
      throw listenerError;
    });
    session.onModeChange(modeListener);

    const volumeListener = vi.fn();
    session.onVolumeChange(() => {
      throw listenerError;
    });
    session.onVolumeChange(volumeListener);

    const statusListener = vi.fn();
    session.onStatusChange(() => {
      throw listenerError;
    });
    session.onStatusChange(statusListener);

    helpers.emitTranscript({ role: "assistant", text: "hello" });
    helpers.emitMode("speaking");
    helpers.emitVolume(0.5);
    helpers.end("finished");

    expect(transcriptListener).toHaveBeenCalledWith({
      role: "assistant",
      text: "hello",
    });
    expect(modeListener).toHaveBeenCalledWith("speaking");
    expect(volumeListener).toHaveBeenCalledWith(0.5);
    expect(statusListener).toHaveBeenCalledWith({
      type: "ended",
      reason: "finished",
      error: undefined,
    });
    expect(helpers.isDisposed()).toBe(true);
    expect(consoleError).toHaveBeenCalledTimes(4);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Voice session listener threw an error",
      listenerError,
    );
  });
});
