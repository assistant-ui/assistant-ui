import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomEvent, Track } from "livekit-client";
import { LiveKitVoiceAdapter } from "./livekit-voice-adapter";

const mock = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => Promise<void>>(),
  microphone: vi.fn<() => Promise<void>>(),
  handlers: new Map<string, (...args: unknown[]) => void>(),
}));

vi.mock("livekit-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("livekit-client")>()),
  Room: class {
    on(event: string, handler: (...args: unknown[]) => void) {
      mock.handlers.set(event, handler);
      return this;
    }
    connect = mock.connect;
    disconnect = mock.disconnect;
    localParticipant = { setMicrophoneEnabled: mock.microphone };
    remoteParticipants = new Map();
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  mock.handlers.clear();
  mock.connect.mockResolvedValue(undefined);
  mock.microphone.mockResolvedValue(undefined);
  mock.disconnect.mockImplementation(async () => {
    mock.handlers.get(RoomEvent.Disconnected)?.();
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const start = (token: string | (() => Promise<string>) = "test") => {
  const controller = new AbortController();
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token,
  }).connect({ abortSignal: controller.signal });
  return { controller, session };
};

describe("LiveKitVoiceAdapter cleanup", () => {
  it.each(["token", "connect", "microphone"] as const)(
    "releases the room after cancellation during %s setup",
    async (stage) => {
      const pending = Promise.withResolvers<void>();
      if (stage === "connect") mock.connect.mockReturnValue(pending.promise);
      if (stage === "microphone")
        mock.microphone.mockReturnValue(pending.promise);
      const { controller, session } = start(
        stage === "token"
          ? async () => {
              await pending.promise;
              return "test";
            }
          : "test",
      );
      if (stage === "microphone") {
        await vi.waitFor(() => expect(mock.microphone).toHaveBeenCalledOnce());
      }

      controller.abort();
      pending.resolve();
      await vi.waitFor(() => expect(mock.disconnect).toHaveBeenCalledOnce());
      session.disconnect();
      expect(mock.disconnect).toHaveBeenCalledOnce();
      expect(session.status).toMatchObject({
        type: "ended",
        reason: "cancelled",
      });
      if (stage !== "microphone")
        expect(mock.microphone).not.toHaveBeenCalled();
      if (stage === "token") expect(mock.connect).not.toHaveBeenCalled();
    },
  );

  it.each(["token", "connect", "microphone"] as const)(
    "releases the room and preserves a %s setup error",
    async (stage) => {
      const error = new Error(`${stage} failed`);
      if (stage === "connect") mock.connect.mockRejectedValue(error);
      if (stage === "microphone") mock.microphone.mockRejectedValue(error);
      const { controller, session } = start(
        stage === "token"
          ? async () => {
              throw error;
            }
          : "test",
      );

      await vi.waitFor(() =>
        expect(session.status).toEqual({
          type: "ended",
          reason: "error",
          error,
        }),
      );
      expect(mock.disconnect).toHaveBeenCalledOnce();
      controller.abort();
      expect(mock.disconnect).toHaveBeenCalledOnce();
    },
  );

  it("releases audio, timers and the room once on normal disconnect", async () => {
    const appendChild = vi.fn();
    vi.stubGlobal("document", { body: { appendChild } });
    const element = { style: { display: "" }, remove: vi.fn() };
    const track = { kind: Track.Kind.Audio, attach: vi.fn(() => element) };
    const { session } = start();
    await vi.waitFor(() => expect(mock.microphone).toHaveBeenCalledOnce());
    mock.handlers.get(RoomEvent.Connected)!();
    mock.handlers.get(RoomEvent.TrackSubscribed)!(track);
    expect(vi.getTimerCount()).toBe(1);
    expect(appendChild).toHaveBeenCalledWith(element);

    session.disconnect();
    session.disconnect();

    expect(element.remove).toHaveBeenCalledOnce();
    expect(mock.disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    mock.handlers.get(RoomEvent.TrackSubscribed)!(track);
    mock.handlers.get(RoomEvent.Connected)!();
    expect(track.attach).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores late tracks while cancelled setup is still pending", async () => {
    const pending = Promise.withResolvers<void>();
    mock.connect.mockReturnValue(pending.promise);
    vi.stubGlobal("document", { body: { appendChild: vi.fn() } });
    const track = {
      kind: Track.Kind.Audio,
      attach: vi.fn(() => ({ style: { display: "" }, remove: vi.fn() })),
    };
    const { controller } = start();
    controller.abort();

    mock.handlers.get(RoomEvent.TrackSubscribed)!(track);
    expect(track.attach).not.toHaveBeenCalled();
    pending.resolve();
    await vi.waitFor(() => expect(mock.disconnect).toHaveBeenCalledOnce());
  });

  it("cleans up after a media-device error without replacing its reason", async () => {
    const { session } = start();
    await vi.waitFor(() => expect(mock.microphone).toHaveBeenCalledOnce());
    const error = new Error("device lost");
    mock.handlers.get(RoomEvent.MediaDevicesError)!(error);

    expect(session.status).toEqual({ type: "ended", reason: "error", error });
    expect(mock.disconnect).toHaveBeenCalledOnce();
    session.disconnect();
    expect(mock.disconnect).toHaveBeenCalledOnce();
  });

  it("preserves setup failures even if room cleanup throws", async () => {
    const error = new Error("microphone denied");
    mock.microphone.mockRejectedValue(error);
    mock.disconnect.mockImplementation(() => {
      throw new Error("cleanup failed");
    });
    const { session } = start();

    await vi.waitFor(() =>
      expect(session.status).toEqual({ type: "ended", reason: "error", error }),
    );
    expect(mock.disconnect).toHaveBeenCalledOnce();
    expect(() => session.disconnect()).not.toThrow();
    expect(mock.disconnect).toHaveBeenCalledOnce();
  });

  it("does not start setup when already aborted", () => {
    const token = vi.fn(async () => "test");
    const session = new LiveKitVoiceAdapter({
      url: "wss://test.invalid",
      token,
    }).connect({
      abortSignal: AbortSignal.abort(),
    });
    expect(session.status).toMatchObject({
      type: "ended",
      reason: "cancelled",
    });
    expect(token).not.toHaveBeenCalled();
    expect(mock.connect).not.toHaveBeenCalled();
    expect(mock.microphone).not.toHaveBeenCalled();
  });

  it("reports asynchronous teardown failures without retrying teardown", async () => {
    const error = new Error("disconnect failed");
    mock.disconnect.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { session } = start();
    await vi.waitFor(() => expect(mock.microphone).toHaveBeenCalledOnce());

    session.disconnect();
    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to disconnect LiveKit room:",
        error,
      ),
    );
    session.disconnect();
    expect(mock.disconnect).toHaveBeenCalledOnce();
  });
});
