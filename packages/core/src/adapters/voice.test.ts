import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVoiceSession,
  type VoiceSessionControls,
  type VoiceSessionHelpers,
} from "./voice";

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

const createPendingTestSession = () => {
  let resolveControls!: (controls: VoiceSessionControls) => void;
  const controlsPromise = new Promise<VoiceSessionControls>((resolve) => {
    resolveControls = resolve;
  });
  const controls = {
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
  };
  const session = createVoiceSession({}, () => controlsPromise);

  return {
    controls,
    controlsPromise,
    resolveControls: () => resolveControls(controls),
    session,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

const deferredControls = () => {
  let resolve!: (controls: VoiceSessionControls) => void;
  const promise = new Promise<VoiceSessionControls>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("createVoiceSession", () => {
  it("applies mute requested while setup is pending", async () => {
    const { controls, controlsPromise, resolveControls, session } =
      createPendingTestSession();

    session.mute();

    expect(session.isMuted).toBe(true);
    expect(controls.mute).not.toHaveBeenCalled();

    resolveControls();
    await controlsPromise;

    expect(controls.mute).toHaveBeenCalledOnce();
  });

  it("does not apply stale mute after unmuting during setup", async () => {
    const { controls, controlsPromise, resolveControls, session } =
      createPendingTestSession();

    session.mute();
    session.unmute();
    resolveControls();
    await controlsPromise;

    expect(session.isMuted).toBe(false);
    expect(controls.mute).not.toHaveBeenCalled();
  });

  it("disconnects immediately when created with an already-aborted signal", async () => {
    const abortController = new AbortController();
    abortController.abort();
    const setup = vi.fn(async () => ({
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    }));

    const session = createVoiceSession(
      { abortSignal: abortController.signal },
      setup,
    );
    await Promise.resolve();

    expect(setup).not.toHaveBeenCalled();
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
  });

  it("removes the abort listener after disconnecting", async () => {
    const abortController = new AbortController();
    const controls = {
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    };
    const session = createVoiceSession(
      { abortSignal: abortController.signal },
      async () => controls,
    );
    await Promise.resolve();
    const statusListener = vi.fn();
    session.onStatusChange(statusListener);

    session.disconnect();
    session.disconnect();
    abortController.abort();

    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(statusListener).toHaveBeenCalledOnce();
    expect(statusListener).toHaveBeenCalledWith({
      type: "ended",
      reason: "cancelled",
    });
    expect(controls.disconnect).toHaveBeenCalledOnce();
  });

  it("ends a running session when the abort signal fires", async () => {
    const abortController = new AbortController();
    const controls = {
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    };
    let helpers: VoiceSessionHelpers | undefined;
    const session = createVoiceSession(
      { abortSignal: abortController.signal },
      async (sessionHelpers) => {
        helpers = sessionHelpers;
        return controls;
      },
    );
    await Promise.resolve();
    if (!helpers) throw new Error("Voice session setup did not start");

    helpers.setStatus({ type: "running" });
    const statusListener = vi.fn();
    session.onStatusChange(statusListener);

    abortController.abort();

    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(statusListener).toHaveBeenCalledOnce();
    expect(statusListener).toHaveBeenCalledWith({
      type: "ended",
      reason: "cancelled",
    });
    expect(controls.disconnect).toHaveBeenCalledOnce();
  });

  it("keeps abort teardown available after the session ends", async () => {
    const abortController = new AbortController();
    const controls = {
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
    };
    let helpers: VoiceSessionHelpers | undefined;
    const session = createVoiceSession(
      { abortSignal: abortController.signal },
      async (sessionHelpers) => {
        helpers = sessionHelpers;
        return controls;
      },
    );
    await Promise.resolve();
    if (!helpers) throw new Error("Voice session setup did not start");

    helpers.end("error");
    abortController.abort();

    expect(session.status).toEqual({
      type: "ended",
      reason: "error",
      error: undefined,
    });
    expect(controls.disconnect).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "tears down late controls once when cleanup throws: %s",
    async (throws) => {
      const abortController = new AbortController();
      const pending = deferredControls();
      const originalError = new Error("connection ended");
      let helpers!: VoiceSessionHelpers;
      const controls = {
        disconnect: vi.fn(() => {
          if (throws) throw new Error("cleanup failed");
        }),
        mute: vi.fn(),
        unmute: vi.fn(),
      };
      const session = createVoiceSession(
        { abortSignal: abortController.signal },
        (value) => {
          helpers = value;
          return pending.promise;
        },
      );
      helpers.end("error", originalError);
      pending.resolve(controls);
      await pending.promise;
      expect(controls.disconnect).toHaveBeenCalledOnce();

      if (!throws) abortController.abort();
      expect(() => session.disconnect()).not.toThrow();
      abortController.abort();

      expect(controls.disconnect).toHaveBeenCalledOnce();
      expect(session.status).toEqual({
        type: "ended",
        reason: "error",
        error: originalError,
      });
      const transcript = vi.fn();
      session.onTranscript(transcript);
      helpers.emitTranscript({ role: "assistant", text: "late" });
      expect(transcript).not.toHaveBeenCalled();
    },
  );

  it.each(["abort", "disconnect"] as const)(
    "releases controls that arrive after %s without skipping or repeating cleanup",
    async (action) => {
      const abortController = new AbortController();
      const pending = deferredControls();
      const controls = { disconnect: vi.fn(), mute: vi.fn(), unmute: vi.fn() };
      const session = createVoiceSession(
        { abortSignal: abortController.signal },
        () => pending.promise,
      );
      if (action === "abort") abortController.abort();
      else session.disconnect();
      expect(controls.disconnect).not.toHaveBeenCalled();

      pending.resolve(controls);
      await pending.promise;
      session.disconnect();
      abortController.abort();

      expect(controls.disconnect).toHaveBeenCalledOnce();
      expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    },
  );

  it("does not reenter late teardown when the adapter disconnects the session", async () => {
    const pending = deferredControls();
    let helpers!: VoiceSessionHelpers;
    const session = createVoiceSession({}, (value) => {
      helpers = value;
      return pending.promise;
    });
    const disconnect = vi.fn(() => session.disconnect());
    helpers.end("finished");

    pending.resolve({ disconnect, mute: vi.fn(), unmute: vi.fn() });
    await pending.promise;

    expect(disconnect).toHaveBeenCalledOnce();
    expect(session.status).toEqual({
      type: "ended",
      reason: "finished",
      error: undefined,
    });
  });

  it("cleans up when the adapter disconnect throws", async () => {
    const disconnectError = new Error("disconnect failed");
    let helpers: VoiceSessionHelpers | undefined;
    const session = createVoiceSession({}, async (sessionHelpers) => {
      helpers = sessionHelpers;
      return {
        disconnect: () => {
          throw disconnectError;
        },
        mute: vi.fn(),
        unmute: vi.fn(),
      };
    });
    await Promise.resolve();
    if (!helpers) throw new Error("Voice session setup did not start");
    const transcriptListener = vi.fn();
    session.onTranscript(transcriptListener);

    expect(() => session.disconnect()).toThrow(disconnectError);
    expect(helpers.isDisposed()).toBe(true);

    helpers.emitTranscript({ role: "assistant", text: "stale" });
    expect(transcriptListener).not.toHaveBeenCalled();
  });

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
