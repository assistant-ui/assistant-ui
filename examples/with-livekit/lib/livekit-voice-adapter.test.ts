import { beforeEach, expect, it, vi } from "vitest";
import { RoomEvent, Track } from "livekit-client";
import { LiveKitVoiceAdapter } from "./livekit-voice-adapter";

const mock = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  setMicrophoneEnabled: vi.fn(),
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
    localParticipant = { setMicrophoneEnabled: mock.setMicrophoneEnabled };
  },
}));

beforeEach(() => {
  mock.connect.mockReset();
  mock.disconnect.mockReset();
  mock.setMicrophoneEnabled.mockReset();
  mock.handlers.clear();
});

it("disconnects a room that connects after cancellation", async () => {
  let finish!: () => void;
  mock.connect.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  const controller = new AbortController();
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({ abortSignal: controller.signal });

  controller.abort();
  finish();
  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects after microphone setup fails", async () => {
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockRejectedValue(new Error("microphone denied"));
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({});

  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects after token retrieval fails", async () => {
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: async () => {
      throw new Error("token failed");
    },
  }).connect({});

  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects immediately while token retrieval is pending", async () => {
  let finish!: (token: string) => void;
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  const controller = new AbortController();
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  }).connect({ abortSignal: controller.signal });

  controller.abort();
  expect(mock.disconnect).toHaveBeenCalledOnce();

  finish("test");
  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects after room connection fails", async () => {
  mock.connect.mockRejectedValue(new Error("connection failed"));
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({});

  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects immediately while microphone setup is pending", async () => {
  let finish!: () => void;
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({ abortSignal: controller.signal });

  await vi.waitFor(() =>
    expect(mock.setMicrophoneEnabled).toHaveBeenCalledOnce(),
  );
  controller.abort();
  expect(mock.disconnect).toHaveBeenCalledOnce();

  finish();
  await vi.waitFor(() => expect(session.status.type).toBe("ended"));
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("disconnects only once after a successful setup", async () => {
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({});

  await vi.waitFor(() =>
    expect(mock.setMicrophoneEnabled).toHaveBeenCalledOnce(),
  );
  session.disconnect();
  session.disconnect();

  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("cleans up when the room disconnects", async () => {
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({});

  await vi.waitFor(() =>
    expect(mock.setMicrophoneEnabled).toHaveBeenCalledOnce(),
  );
  mock.handlers.get(RoomEvent.Disconnected)?.();

  expect(session.status).toEqual({ type: "ended", reason: "finished" });
  expect(mock.disconnect).toHaveBeenCalledOnce();
});

it("ignores remote tracks after cleanup", async () => {
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  const controller = new AbortController();
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({ abortSignal: controller.signal });

  await vi.waitFor(() =>
    expect(mock.setMicrophoneEnabled).toHaveBeenCalledOnce(),
  );
  controller.abort();
  const attach = vi.fn();
  mock.handlers.get(RoomEvent.TrackSubscribed)?.({
    attach,
    kind: Track.Kind.Audio,
  });

  expect(attach).not.toHaveBeenCalled();
  expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
});

it("does not repeat room cleanup after a disconnect error", async () => {
  const disconnectError = new Error("disconnect failed");
  mock.connect.mockResolvedValue(undefined);
  mock.setMicrophoneEnabled.mockResolvedValue(undefined);
  mock.disconnect.mockImplementation(() => {
    throw disconnectError;
  });
  const session = new LiveKitVoiceAdapter({
    url: "wss://test.invalid",
    token: "test",
  }).connect({});

  await vi.waitFor(() =>
    expect(mock.setMicrophoneEnabled).toHaveBeenCalledOnce(),
  );
  expect(() => session.disconnect()).toThrow(disconnectError);
  expect(() => session.disconnect()).not.toThrow();
  expect(mock.disconnect).toHaveBeenCalledOnce();
});
