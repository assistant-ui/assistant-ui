// GeminiLiveVoiceAdapter: the first frame of a typed reply is held back one macrotask
// (setTimeout 0) so the runtime records the typed turn first; frames that arrive meanwhile
// queue behind it. When the socket closes before that timer runs, end() flushes only the
// transcripts already accumulated, and the timer then skips the queued frames because the
// session is closed. The reply's first transcript (and any speech queued with it) never
// reaches the runtime, although the session ends "finished" or "error".
//
// Copy to packages/react/src/adapters/ and run from packages/react:
//   pnpm exec vitest run src/adapters/gemini-live-deferred-reply-lost-on-close.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiLiveVoiceAdapter } from "./GeminiLiveVoiceAdapter";

vi.mock("./gemini-live/audio", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  openMicrophone: async () => ({
    setMuted: () => {},
    level: () => 0,
    close: async () => {},
  }),
  createPcmPlayer: () => ({
    enqueue: () => {},
    clear: () => {},
    isPlaying: () => false,
    level: () => 0,
    close: async () => {},
  }),
}));

class Socket {
  static instances: Socket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });
  constructor(public url: string) {
    Socket.instances.push(this);
  }
  emit(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const connected = async () => {
  const session = new GeminiLiveVoiceAdapter({
    getToken: async () => "token",
    model: "m",
  }).connect({});
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
  const socket = Socket.instances[0]!;
  socket.readyState = 1;
  socket.onopen?.();
  socket.emit({ setupComplete: {} });
  await vi.waitFor(() => expect(session.status.type).toBe("running"));
  const transcripts: { role: string; text: string; isFinal?: boolean }[] = [];
  session.onTranscript((t) => transcripts.push(t));
  return { session, socket, transcripts };
};

beforeEach(() => {
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GL-1: a typed reply's deferred first frame", () => {
  for (const code of [1000, 1011]) {
    it(`is delivered when the socket closes (${code}) before it is forwarded`, async () => {
      const { session, socket, transcripts } = await connected();
      const sent = session.sendText!("hello");
      socket.emit({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
          outputTranscription: { text: "Hi there" },
        },
      });
      await sent; // resolved; the frame waits for a setTimeout(0)
      socket.emit({ serverContent: { inputTranscription: { text: "wait" } } });
      socket.readyState = 3;
      socket.onclose?.({ code, reason: "" }); // before that timer runs
      await new Promise((r) => setTimeout(r, 0));

      expect(session.status.type).toBe("ended");
      expect(transcripts).toContainEqual({
        role: "assistant",
        text: "Hi there",
        isFinal: true,
      });
      expect(transcripts).toContainEqual({
        role: "user",
        text: "wait",
        isFinal: true,
      });
    });
  }

  it("is delivered when the socket stays open (control)", async () => {
    const { session, socket, transcripts } = await connected();
    const sent = session.sendText!("hello");
    socket.emit({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
        outputTranscription: { text: "Hi there" },
      },
    });
    await sent;
    socket.emit({ serverContent: { inputTranscription: { text: "wait" } } });
    await new Promise((r) => setTimeout(r, 0));
    socket.readyState = 3;
    socket.onclose?.({ code: 1000, reason: "" });

    expect(session.status.type).toBe("ended");
    expect(transcripts).toContainEqual({
      role: "assistant",
      text: "Hi there",
      isFinal: true,
    });
    expect(transcripts).toContainEqual({
      role: "user",
      text: "wait",
      isFinal: true,
    });
  });
});
