import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiLiveVoiceAdapter } from "./GeminiLiveVoiceAdapter";

const audio = vi.hoisted(() => {
  const microphone = {
    setMuted: vi.fn(),
    level: vi.fn(() => 0.7),
    close: vi.fn(async () => {}),
  };
  const player = {
    enqueue: vi.fn(),
    clear: vi.fn(),
    isPlaying: vi.fn(() => false),
    level: vi.fn(() => 0.4),
    close: vi.fn(async () => {}),
  };
  return {
    microphone,
    player,
    onChunk: undefined as ((base64: string) => void) | undefined,
    onIdle: undefined as (() => void) | undefined,
    openMicrophone: vi.fn(
      async (options: {
        onChunk: (base64: string) => void;
        signal?: AbortSignal;
      }) => {
        audio.onChunk = options.onChunk;
        return microphone;
      },
    ),
    createPcmPlayer: vi.fn((options: { onIdle?: () => void }) => {
      audio.onIdle = options.onIdle;
      return player;
    }),
  };
});

vi.mock("./gemini-live/audio", () => ({
  openMicrophone: audio.openMicrophone,
  createPcmPlayer: audio.createPcmPlayer,
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
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  send = vi.fn<(data: string) => void>();
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });
  url: string;
  constructor(url: string) {
    this.url = url;
    Socket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  emit(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  events() {
    return this.send.mock.calls.map(([data]) => JSON.parse(data));
  }
}

const getToken = vi.fn<(options: { signal: AbortSignal }) => Promise<string>>(
  async () => "ephemeral-token",
);
const sessions: ReturnType<GeminiLiveVoiceAdapter["connect"]>[] = [];

const start = (abortSignal?: AbortSignal) => {
  const session = new GeminiLiveVoiceAdapter({ getToken }).connect(
    abortSignal ? { abortSignal } : {},
  );
  sessions.push(session);
  return session;
};

const opened = async (abortSignal?: AbortSignal) => {
  const session = start(abortSignal);
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
  const socket = Socket.instances[0]!;
  socket.open();
  return { session, socket };
};

const connected = async () => {
  const result = await opened();
  result.socket.emit({ setupComplete: {} });
  await vi.waitFor(() => expect(result.session.status.type).toBe("running"));
  return result;
};

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  Socket.instances = [];
  audio.onChunk = undefined;
  audio.onIdle = undefined;
  audio.player.isPlaying.mockReturnValue(false);
  getToken.mockResolvedValue("ephemeral-token");
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
});

afterEach(() => {
  for (const session of sessions.splice(0)) session.disconnect();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GeminiLiveVoiceAdapter", () => {
  it("fetches a token, sends setup, and waits for setupComplete before running", async () => {
    const { session, socket } = await opened();
    expect(getToken).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(socket.url).toBe(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=ephemeral-token",
    );
    expect(socket.events()).toEqual([
      {
        setup: {
          model: "models/gemini-3.8-live",
          generationConfig: { responseModalities: ["AUDIO"] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      },
    ]);
    expect(session.status).toEqual({ type: "starting" });
    expect(audio.openMicrophone).toHaveBeenCalledWith(
      expect.objectContaining({ sampleRate: 16000 }),
    );
    expect(audio.createPcmPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ sampleRate: 24000 }),
    );
    const onMode = vi.fn();
    session.onModeChange(onMode);
    socket.emit({ setupComplete: {} });
    expect(session.status).toEqual({ type: "running" });
    expect(onMode).toHaveBeenCalledWith("listening");
    expect(session.sendText).toBeTypeOf("function");
  });

  it("uses the configured model", async () => {
    const session = new GeminiLiveVoiceAdapter({
      getToken,
      model: "gemini-3.8-live-extended-thinking",
    }).connect({});
    sessions.push(session);
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    Socket.instances[0]!.open();
    expect(Socket.instances[0]!.events()[0].setup.model).toBe(
      "models/gemini-3.8-live-extended-thinking",
    );
  });

  it("streams microphone chunks only once setup is complete", async () => {
    const { socket } = await opened();
    audio.onChunk?.("AAAA");
    expect(socket.events()).toHaveLength(1);
    socket.emit({ setupComplete: {} });
    audio.onChunk?.("AAAA");
    expect(socket.events().at(-1)).toEqual({
      realtimeInput: {
        audio: { data: "AAAA", mimeType: "audio/pcm;rate=16000" },
      },
    });
  });

  it("plays model audio and reports speaking until playback drains", async () => {
    const { session, socket } = await connected();
    const onMode = vi.fn();
    session.onModeChange(onMode);
    socket.emit({
      serverContent: {
        modelTurn: {
          parts: [
            { inlineData: { mimeType: "audio/pcm;rate=24000", data: "AQID" } },
          ],
        },
      },
    });
    audio.player.isPlaying.mockReturnValue(true);
    socket.emit({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: "BAUG" } }] },
      },
    });
    expect(audio.player.enqueue.mock.calls).toEqual([["AQID"], ["BAUG"]]);
    expect(onMode.mock.calls).toEqual([["speaking"]]);
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onMode.mock.calls).toEqual([["speaking"]]);
    audio.onIdle?.();
    expect(onMode).toHaveBeenLastCalledWith("listening");
  });

  it("emits final user transcripts and cumulative assistant transcripts", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { interimInputTranscription: { text: "Hel" } },
    });
    socket.emit({ serverContent: { inputTranscription: { text: "Hello" } } });
    socket.emit({ serverContent: { outputTranscription: { text: "Good " } } });
    socket.emit({
      serverContent: { outputTranscription: { text: "morning" } },
    });
    socket.emit({ serverContent: { generationComplete: true } });
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit({ serverContent: { outputTranscription: { text: "Next" } } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hello", isFinal: true },
      { role: "assistant", text: "Good ", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: true },
      { role: "assistant", text: "Next", isFinal: false },
    ]);
  });

  it("clears playback and finalizes the reply when the user interrupts", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { outputTranscription: { text: "Let me" } } });
    socket.emit({ serverContent: { interrupted: true } });
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "assistant",
      text: "Let me",
      isFinal: true,
    });
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript).toHaveBeenCalledTimes(2);
  });

  it("mutes the microphone and tells Gemini the audio stream paused", async () => {
    const { session, socket } = await connected();
    session.mute();
    expect(audio.microphone.setMuted).toHaveBeenLastCalledWith(true);
    expect(socket.events().at(-1)).toEqual({
      realtimeInput: { audioStreamEnd: true },
    });
    session.unmute();
    expect(audio.microphone.setMuted).toHaveBeenLastCalledWith(false);
  });

  it("applies a mute requested before the microphone opened", async () => {
    const session = start();
    session.mute();
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    expect(audio.microphone.setMuted).toHaveBeenCalledWith(true);
  });

  it("reports the louder of microphone and playback, ignoring a muted microphone", async () => {
    vi.useFakeTimers();
    const { session } = await connected();
    const onVolume = vi.fn();
    session.onVolumeChange(onVolume);
    await vi.advanceTimersByTimeAsync(100);
    expect(onVolume).toHaveBeenLastCalledWith(0.7);
    session.mute();
    await vi.advanceTimersByTimeAsync(100);
    expect(onVolume).toHaveBeenLastCalledWith(0.4);
  });

  it("resolves a typed send when the new reply starts and forwards that reply afterwards", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    const accepted = vi.fn();
    const sent = Promise.resolve(session.sendText!("Change the topic"));
    void sent.then(accepted);
    expect(socket.events().at(-1)).toEqual({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: "Change the topic" }] }],
        turnComplete: true,
      },
    });
    socket.emit({ serverContent: { inputTranscription: { text: "Hello" } } });
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
        outputTranscription: { text: "Sure" },
      },
    });
    await sent;
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hello", isFinal: true },
    ]);
    expect(audio.player.enqueue).not.toHaveBeenCalled();
    await flush();
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "assistant",
      text: "Sure",
      isFinal: false,
    });
    expect(audio.player.enqueue).toHaveBeenCalledWith("AQID");
  });

  it("finishes the interrupted reply before accepting a typed send", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { outputTranscription: { text: "Previous" } },
    });
    const accepted = vi.fn();
    const sent = Promise.resolve(session.sendText!("Change the topic"));
    void sent.then(accepted);
    socket.emit({ serverContent: { outputTranscription: { text: " reply" } } });
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit({ serverContent: { interrupted: true } });
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "assistant", text: "Previous", isFinal: false },
      { role: "assistant", text: "Previous reply", isFinal: false },
      { role: "assistant", text: "Previous reply", isFinal: true },
    ]);
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit({ serverContent: { outputTranscription: { text: "New" } } });
    await sent;
    expect(onTranscript).toHaveBeenCalledTimes(3);
    await flush();
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "assistant",
      text: "New",
      isFinal: false,
    });
  });

  it("accepts a typed send after the previous reply completed on its own", async () => {
    const { session, socket } = await connected();
    socket.emit({ serverContent: { outputTranscription: { text: "Old" } } });
    const sent = session.sendText!("Hello");
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit({ serverContent: { outputTranscription: { text: "New" } } });
    await expect(sent).resolves.toBeUndefined();
  });

  it("rejects a typed send before setup completes", async () => {
    const { session } = await opened();
    await expect(session.sendText!("Hello")).rejects.toThrow("not connected");
    expect(session.status).toEqual({ type: "starting" });
  });

  it("rejects a typed send that gets no reply", async () => {
    const { session } = await connected();
    vi.useFakeTimers();
    const rejected = expect(session.sendText!("Hello")).rejects.toThrow(
      "did not start a reply",
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
    expect(session.status.type).toBe("running");
  });

  it("rejects a pending typed send on disconnect and when replaced", async () => {
    const { session } = await connected();
    const first = expect(session.sendText!("First")).rejects.toThrow(
      "replaced",
    );
    const second = expect(session.sendText!("Second")).rejects.toThrow(
      "disconnected before accepting",
    );
    await first;
    session.disconnect();
    await second;
  });

  it("ends with an error when the socket closes before setup completes", async () => {
    const { session, socket } = await opened();
    socket.close();
    expect(session.status).toMatchObject({ type: "ended", reason: "error" });
    expect(audio.microphone.close).toHaveBeenCalledOnce();
    expect(audio.player.close).toHaveBeenCalledOnce();
  });

  it("ends normally when the server closes a running session", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { session, socket } = await connected();
      socket.emit({ goAway: { timeLeft: "10s" } });
      expect(warn).toHaveBeenCalledOnce();
      socket.close();
      expect(session.status).toEqual({ type: "ended", reason: "finished" });
    } finally {
      warn.mockRestore();
    }
  });

  it("ends with an error on socket failure", async () => {
    const { session, socket } = await connected();
    socket.onerror?.();
    expect(session.status).toMatchObject({ type: "ended", reason: "error" });
    expect(socket.close).toHaveBeenCalledOnce();
  });

  it("ends with an error when the token request fails", async () => {
    getToken.mockRejectedValue(new Error("Unauthorized"));
    const session = start();
    await vi.waitFor(() =>
      expect(session.status).toMatchObject({ type: "ended", reason: "error" }),
    );
    expect(Socket.instances).toHaveLength(0);
    expect(audio.openMicrophone).not.toHaveBeenCalled();
  });

  it("decodes binary frames", async () => {
    const { session, socket } = await connected();
    expect(socket.binaryType).toBe("arraybuffer");
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.onmessage?.({
      data: new TextEncoder().encode(
        JSON.stringify({
          serverContent: { inputTranscription: { text: "One" } },
        }),
      ).buffer,
    });
    expect(onTranscript).toHaveBeenCalledWith({
      role: "user",
      text: "One",
      isFinal: true,
    });
  });

  it("stops the socket, microphone, playback, and timers exactly once", async () => {
    vi.useFakeTimers();
    const { session, socket } = await connected();
    session.disconnect();
    session.disconnect();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(audio.microphone.close).toHaveBeenCalledOnce();
    expect(audio.player.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
  });

  it("aborts an in-flight token request and releases a late microphone", async () => {
    let resolveToken!: (token: string) => void;
    getToken.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveToken = resolve;
      }),
    );
    const controller = new AbortController();
    const session = start(controller.signal);
    await vi.waitFor(() => expect(getToken).toHaveBeenCalled());
    controller.abort();
    expect(getToken.mock.calls[0]![0].signal.aborted).toBe(true);
    resolveToken("late-token");
    await flush();
    expect(Socket.instances).toHaveLength(0);
    expect(audio.openMicrophone).not.toHaveBeenCalled();
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
  });

  it("releases a microphone that opens after disconnect", async () => {
    let resolveMicrophone!: (microphone: typeof audio.microphone) => void;
    audio.openMicrophone.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMicrophone = resolve;
      }),
    );
    const session = start();
    await vi.waitFor(() => expect(audio.openMicrophone).toHaveBeenCalled());
    session.disconnect();
    resolveMicrophone(audio.microphone);
    await flush();
    expect(audio.microphone.close).toHaveBeenCalledOnce();
    expect(Socket.instances).toHaveLength(0);
  });

  it("times out a connection that never completes setup", async () => {
    vi.useFakeTimers();
    const { session } = await opened();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(session.status).toMatchObject({ type: "ended", reason: "error" });
  });

  it("fails outside a browser", async () => {
    vi.stubGlobal("WebSocket", undefined);
    const session = start();
    await vi.waitFor(() =>
      expect(session.status).toMatchObject({ type: "ended", reason: "error" }),
    );
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does not allocate anything for an already-aborted connection", () => {
    const session = new GeminiLiveVoiceAdapter({ getToken }).connect({
      abortSignal: AbortSignal.abort(),
    });
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(getToken).not.toHaveBeenCalled();
  });
});
