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

vi.mock("./gemini-live/audio", async (importOriginal) => ({
  ...(await importOriginal()),
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
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  send = vi.fn<(data: string) => void>();
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: "" });
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
  const session = new GeminiLiveVoiceAdapter({
    getToken,
    model: "live-test-model",
  }).connect(abortSignal ? { abortSignal } : {});
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

const reply = (text: string) => ({
  serverContent: {
    modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
    outputTranscription: { text },
  },
});

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
          model: "models/live-test-model",
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

  it("streams cumulative assistant transcripts once the user transcription is finished", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { interimInputTranscription: { text: "Hel" } },
    });
    socket.emit({ serverContent: { inputTranscription: { text: "Hel" } } });
    socket.emit({
      serverContent: { inputTranscription: { text: "lo", finished: true } },
    });
    socket.emit(reply("Good "));
    socket.emit({
      serverContent: { outputTranscription: { text: "morning" } },
    });
    socket.emit({ serverContent: { generationComplete: true } });
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hello", isFinal: true },
      { role: "assistant", text: "Good ", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: true },
    ]);
  });

  it("keeps late input transcription in the spoken turn by holding the reply transcript", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { inputTranscription: { text: "What's" } } });
    socket.emit({
      serverContent: { inputTranscription: { text: " the weather?" } },
    });
    socket.emit({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
      },
    });
    socket.emit(reply("Sunny"));
    socket.emit({
      serverContent: { inputTranscription: { text: " Thanks." } },
    });
    socket.emit({ serverContent: { outputTranscription: { text: " today" } } });
    expect(onTranscript).not.toHaveBeenCalled();
    expect(audio.player.enqueue).toHaveBeenCalledWith("AQID");
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "What's the weather? Thanks.", isFinal: true },
      { role: "assistant", text: "Sunny today", isFinal: true },
    ]);
  });

  it("releases the held reply transcript when the user transcription finishes mid-reply", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { inputTranscription: { text: "Hi" } } });
    socket.emit(reply("Hello"));
    socket.emit({
      serverContent: { inputTranscription: { text: " there", finished: true } },
    });
    socket.emit({ serverContent: { outputTranscription: { text: "!" } } });
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi there", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: false },
      { role: "assistant", text: "Hello!", isFinal: false },
      { role: "assistant", text: "Hello!", isFinal: true },
    ]);
  });

  it("carries speech that arrives after the reply streams into the next turn", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Hello"));
    socket.emit({ serverContent: { inputTranscription: { text: "Again" } } });
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit(reply("Sure"));
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: false },
      { role: "assistant", text: "Hello", isFinal: true },
      { role: "user", text: "Again", isFinal: true },
      { role: "assistant", text: "Sure", isFinal: true },
    ]);
  });

  it("flushes input transcription when the server marks it finished or the turn ends", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { inputTranscription: { text: "Stop" } } });
    socket.emit({
      serverContent: { inputTranscription: { text: " now", finished: true } },
    });
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "user",
      text: "Stop now",
      isFinal: true,
    });
    socket.emit({ serverContent: { inputTranscription: { text: "Bye" } } });
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "user",
      text: "Bye",
      isFinal: true,
    });
    socket.emit({ serverContent: { inputTranscription: { text: "Wait" } } });
    socket.emit({ serverContent: { interrupted: true } });
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "user",
      text: "Wait",
      isFinal: true,
    });
    expect(onTranscript).toHaveBeenCalledTimes(3);
  });

  it("clears playback and finalizes the reply when the user interrupts", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    const onMode = vi.fn();
    session.onModeChange(onMode);
    audio.player.isPlaying.mockReturnValue(true);
    socket.emit(reply("Let me"));
    socket.emit({ serverContent: { interrupted: true } });
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onMode).toHaveBeenLastCalledWith("listening");
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "assistant", text: "Let me", isFinal: true },
    ]);
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript).toHaveBeenCalledOnce();
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
    socket.emit(reply("Previous"));
    audio.player.isPlaying.mockReturnValue(true);
    const onMode = vi.fn();
    session.onModeChange(onMode);
    const accepted = vi.fn();
    const sent = Promise.resolve(session.sendText!("Change the topic"));
    void sent.then(accepted);
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onMode).toHaveBeenLastCalledWith("listening");
    audio.player.isPlaying.mockReturnValue(false);
    socket.emit(reply(" reply"));
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit({ serverContent: { interrupted: true } });
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "assistant", text: "Previous reply", isFinal: true },
    ]);
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit(reply("New"));
    await sent;
    expect(onTranscript).toHaveBeenCalledOnce();
    await flush();
    expect(onTranscript).toHaveBeenLastCalledWith({
      role: "assistant",
      text: "New",
      isFinal: false,
    });
  });

  it("does not take a late transcript of the interrupted reply as the typed reply", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Let me"));
    const accepted = vi.fn();
    const sent = Promise.resolve(session.sendText!("Stop"));
    void sent.then(accepted);
    socket.emit({ serverContent: { interrupted: true } });
    socket.emit({
      serverContent: { outputTranscription: { text: " explain" } },
    });
    await flush();
    expect(accepted).not.toHaveBeenCalled();
    socket.emit(reply("Okay"));
    await sent;
    await flush();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Let me", isFinal: false },
      { role: "assistant", text: "Let me", isFinal: true },
      { role: "assistant", text: "Okay", isFinal: false },
    ]);
  });

  it("does not start a reply from a transcript that trails turnComplete", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Hello"));
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit({ serverContent: { outputTranscription: { text: " there" } } });
    socket.emit({
      serverContent: { inputTranscription: { text: "Bye", finished: true } },
    });
    socket.emit(reply("Later"));
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: false },
      { role: "assistant", text: "Hello", isFinal: true },
      { role: "user", text: "Bye", isFinal: true },
      { role: "assistant", text: "Later", isFinal: false },
      { role: "assistant", text: "Later", isFinal: true },
    ]);
  });

  it("ends with an error when a deferred typed-reply frame cannot be played", async () => {
    const { session, socket } = await connected();
    const sent = session.sendText!("Hello");
    socket.emit(reply("One"));
    audio.player.enqueue.mockImplementationOnce(() => {
      throw new Error("invalid audio");
    });
    await sent;
    await flush();
    expect(session.status).toMatchObject({
      type: "ended",
      reason: "error",
      error: expect.objectContaining({ message: "invalid audio" }),
    });
  });

  it("keeps frames that arrive during the deferred first chunk in order", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    const sent = session.sendText!("Hello");
    socket.emit(reply("One"));
    socket.emit(reply(" two"));
    socket.emit({ serverContent: { turnComplete: true } });
    await sent;
    expect(onTranscript).not.toHaveBeenCalled();
    await flush();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "assistant", text: "One", isFinal: false },
      { role: "assistant", text: "One two", isFinal: false },
      { role: "assistant", text: "One two", isFinal: true },
    ]);
  });

  it("reports the close code when the socket closes before setup", async () => {
    const { session, socket } = await opened();
    socket.readyState = 3;
    socket.onclose?.({ code: 1008, reason: "invalid token" });
    expect(session.status).toMatchObject({
      type: "ended",
      reason: "error",
      error: expect.objectContaining({
        message: expect.stringContaining("1008: invalid token"),
      }),
    });
  });

  it("accepts a typed send after the previous reply completed on its own", async () => {
    const { session, socket } = await connected();
    socket.emit(reply("Old"));
    const sent = session.sendText!("Hello");
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit(reply("New"));
    await expect(sent).resolves.toBeUndefined();
  });

  it("clears audio still buffered after turnComplete when text is typed", async () => {
    const { session, socket } = await connected();
    socket.emit({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
        turnComplete: true,
      },
    });
    audio.player.isPlaying.mockReturnValue(true);
    const onMode = vi.fn();
    session.onModeChange(onMode);
    const sent = session.sendText!("Next question");
    expect(audio.player.clear).toHaveBeenCalledOnce();
    expect(onMode).toHaveBeenLastCalledWith("listening");
    socket.emit(reply("Sure"));
    await expect(sent).resolves.toBeUndefined();
  });

  it("accepts a typed send whose reply arrives while the previous one is still deferred", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    const first = session.sendText!("One");
    socket.emit(reply("First"));
    await first;
    const second = session.sendText!("Two");
    socket.emit({ serverContent: { interrupted: true } });
    socket.emit(reply("Second"));
    await flush();
    await expect(second).resolves.toBeUndefined();
    await flush();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "assistant", text: "First", isFinal: false },
      { role: "assistant", text: "First", isFinal: true },
      { role: "assistant", text: "Second", isFinal: false },
    ]);
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

  it("keeps separate utterances heard during a streaming reply as separate messages", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Hello"));
    socket.emit({
      serverContent: { inputTranscription: { text: "Again", finished: true } },
    });
    socket.emit({
      serverContent: { inputTranscription: { text: "Wait", finished: true } },
    });
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit(reply("Sure"));
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: false },
      { role: "assistant", text: "Hello", isFinal: true },
      { role: "user", text: "Again", isFinal: true },
      { role: "user", text: "Wait", isFinal: true },
      { role: "assistant", text: "Sure", isFinal: false },
    ]);
  });

  it("ignores the turnComplete that follows an interruption", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Sure"));
    socket.emit({ serverContent: { inputTranscription: { text: "No" } } });
    socket.emit({ serverContent: { interrupted: true } });
    socket.emit({ serverContent: { turnComplete: true } });
    socket.emit({ serverContent: { inputTranscription: { text: " wait" } } });
    socket.emit(reply("Ok"));
    socket.emit({ serverContent: { turnComplete: true } });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Sure", isFinal: false },
      { role: "assistant", text: "Sure", isFinal: true },
      { role: "user", text: "No wait", isFinal: true },
      { role: "assistant", text: "Ok", isFinal: true },
    ]);
  });

  it("keeps input transcription that arrives with the first frame of a typed reply ahead of it", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    const sent = session.sendText!("Typed");
    socket.emit({
      serverContent: {
        inputTranscription: { text: "Um" },
        modelTurn: { parts: [{ inlineData: { data: "AQID" } }] },
        outputTranscription: { text: "Sure" },
      },
    });
    await sent;
    await flush();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Um", isFinal: true },
      { role: "assistant", text: "Sure", isFinal: false },
    ]);
  });

  it("emits unfinished speech heard during a reply when the server closes", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({
      serverContent: { inputTranscription: { text: "Hi", finished: true } },
    });
    socket.emit(reply("Hello"));
    socket.emit({ serverContent: { inputTranscription: { text: "Bye" } } });
    socket.close();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: false },
      { role: "assistant", text: "Hello", isFinal: true },
      { role: "user", text: "Bye", isFinal: true },
    ]);
  });

  it("emits held transcripts when the socket fails", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { inputTranscription: { text: "Hi" } } });
    socket.emit(reply("Hello"));
    socket.onerror?.();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: true },
    ]);
    expect(session.status).toMatchObject({ type: "ended", reason: "error" });
  });

  it("ends with an error when a running session closes abnormally without goAway", async () => {
    const { session, socket } = await connected();
    socket.readyState = 3;
    socket.onclose?.({ code: 1011, reason: "internal error" });
    expect(session.status).toMatchObject({
      type: "ended",
      reason: "error",
      error: expect.objectContaining({
        message: expect.stringContaining("1011: internal error"),
      }),
    });
  });

  it("emits held transcripts when the server closes mid-turn", async () => {
    const { session, socket } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.emit({ serverContent: { inputTranscription: { text: "Hi" } } });
    socket.emit(reply("Hello"));
    socket.close();
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hi", isFinal: true },
      { role: "assistant", text: "Hello", isFinal: true },
    ]);
    expect(session.status).toEqual({ type: "ended", reason: "finished" });
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
    expect(audio.microphone.close).toHaveBeenCalledOnce();
  });

  it("ends with an error when a frame cannot be played", async () => {
    const { session, socket } = await connected();
    audio.player.enqueue.mockImplementationOnce(() => {
      throw new Error("invalid audio");
    });
    socket.emit({
      serverContent: { modelTurn: { parts: [{ inlineData: { data: "!" } }] } },
    });
    expect(session.status).toMatchObject({
      type: "ended",
      reason: "error",
      error: expect.objectContaining({ message: "invalid audio" }),
    });
  });

  it("decodes binary frames", async () => {
    const { session, socket } = await connected();
    expect(socket.binaryType).toBe("arraybuffer");
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    socket.onmessage?.({
      data: new TextEncoder().encode(
        JSON.stringify({
          serverContent: {
            inputTranscription: { text: "One", finished: true },
          },
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

  it("aborts an in-flight token request and releases the microphone", async () => {
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
    expect(audio.microphone.close).toHaveBeenCalledOnce();
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
    const session = new GeminiLiveVoiceAdapter({
      getToken,
      model: "live-test-model",
    }).connect({
      abortSignal: AbortSignal.abort(),
    });
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(getToken).not.toHaveBeenCalled();
  });
});
