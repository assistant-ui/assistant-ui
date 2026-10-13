import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIRealtimeVoiceAdapter } from "./OpenAIRealtimeVoiceAdapter";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

class Channel {
  readyState = "connecting";
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn<(data: string) => void>();
  close = vi.fn(() => {
    this.readyState = "closed";
    this.onclose?.();
  });
  open() {
    this.readyState = "open";
    this.onopen?.();
  }
  emit(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
  events() {
    return this.send.mock.calls.map(([data]) => JSON.parse(data));
  }
}

class Peer {
  static instances: Peer[] = [];
  channel = new Channel();
  connectionState = "new";
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { track: { kind: string } }) => void) | null = null;
  createDataChannel = vi.fn(() => this.channel);
  addTrack = vi.fn();
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "browser-offer" }));
  setLocalDescription = vi.fn(async () => {});
  setRemoteDescription = vi.fn(async () => {});
  getStats = vi.fn(
    async () =>
      new Map([
        ["input", { type: "media-source", audioLevel: 0.7 }],
        ["output", { type: "inbound-rtp", audioLevel: 0.4 }],
      ]),
  );
  close = vi.fn(() => {
    this.connectionState = "closed";
    this.onconnectionstatechange?.();
  });
  constructor() {
    Peer.instances.push(this);
  }
}

const track = { enabled: true, stop: vi.fn() };
const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
const getUserMedia = vi.fn(async () => stream);
const audio = {
  autoplay: false,
  srcObject: null as unknown,
  play: vi.fn(async () => {}),
  pause: vi.fn(),
};
const exchangeSdp = vi.fn<
  (sdp: string, options: { signal: AbortSignal }) => Promise<string>
>(async () => "server-answer");
const sessions: ReturnType<OpenAIRealtimeVoiceAdapter["connect"]>[] = [];

const start = (abortSignal?: AbortSignal) => {
  const session = new OpenAIRealtimeVoiceAdapter({ exchangeSdp }).connect(
    abortSignal ? { abortSignal } : {},
  );
  sessions.push(session);
  const peer = Peer.instances.at(-1)!;
  return { session, peer, channel: peer.channel };
};

const connected = async () => {
  const result = start();
  await vi.waitFor(() =>
    expect(result.peer.setRemoteDescription).toHaveBeenCalled(),
  );
  result.channel.open();
  result.channel.emit({
    type: "session.created",
    session: {
      audio: { input: { transcription: { model: "gpt-4o-mini-transcribe" } } },
    },
  });
  return result;
};

beforeEach(() => {
  Peer.instances = [];
  track.enabled = true;
  getUserMedia.mockResolvedValue(stream);
  exchangeSdp.mockResolvedValue("server-answer");
  audio.play.mockResolvedValue();
  vi.stubGlobal("RTCPeerConnection", Peer);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("document", { createElement: () => audio });
  vi.stubGlobal(
    "MediaStream",
    class {
      tracks: unknown[];
      constructor(tracks: unknown[]) {
        this.tracks = tracks;
      }
    },
  );
});

afterEach(() => {
  for (const session of sessions.splice(0)) session.disconnect();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("OpenAIRealtimeVoiceAdapter", () => {
  it("exchanges SDP and waits for the data channel before becoming usable", async () => {
    const { session, peer, channel } = start();
    await vi.waitFor(() => expect(exchangeSdp).toHaveBeenCalled());
    expect(exchangeSdp).toHaveBeenCalledWith("browser-offer", {
      signal: expect.any(AbortSignal),
    });
    expect(peer.setRemoteDescription).toHaveBeenCalledWith({
      type: "answer",
      sdp: "server-answer",
    });
    expect(peer.addTrack).toHaveBeenCalledWith(track, stream);
    expect(session.status).toEqual({ type: "starting" });
    channel.open();
    expect(session.status).toEqual({ type: "running" });
    expect(session.sendText).toBeTypeOf("function");
  });

  it("streams cumulative assistant transcripts and records completed user audio", async () => {
    const { session, channel } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    channel.emit({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hello",
    });
    channel.emit({
      type: "response.output_audio_transcript.delta",
      item_id: "a",
      delta: "Good ",
    });
    channel.emit({
      type: "response.output_audio_transcript.delta",
      item_id: "a",
      delta: "morning",
    });
    channel.emit({
      type: "response.output_audio_transcript.done",
      item_id: "a",
      transcript: "Good morning!",
    });
    channel.emit({
      type: "response.output_audio_transcript.delta",
      item_id: "b",
      delta: "Next",
    });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hello", isFinal: true },
      { role: "assistant", text: "Good ", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: false },
      { role: "assistant", text: "Good morning!", isFinal: true },
      { role: "assistant", text: "Next", isFinal: false },
    ]);
  });

  it("uses audio playback events instead of generation completion for speaking state", async () => {
    const { session, channel } = await connected();
    const onMode = vi.fn();
    session.onModeChange(onMode);
    channel.emit({ type: "output_audio_buffer.started" });
    channel.emit({ type: "response.done", response: { status: "completed" } });
    expect(onMode.mock.calls).toEqual([["speaking"]]);
    channel.emit({ type: "input_audio_buffer.speech_started" });
    expect(onMode.mock.calls).toEqual([["speaking"]]);
    channel.emit({ type: "output_audio_buffer.cleared" });
    expect(onMode).toHaveBeenLastCalledWith("listening");
  });

  it("holds replies until preceding spoken turns are transcribed in conversation order", async () => {
    const { session, channel } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    for (const id of ["first", "second"]) {
      channel.emit({ type: "input_audio_buffer.committed", item_id: id });
      channel.emit({
        type: "response.output_audio_transcript.done",
        item_id: `${id}-reply`,
        transcript: `Reply to ${id}`,
      });
    }
    channel.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "second",
      transcript: "Second question",
    });
    expect(onTranscript).not.toHaveBeenCalled();
    channel.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "first",
      transcript: "First question",
    });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "First question", isFinal: true },
      { role: "assistant", text: "Reply to first", isFinal: true },
      { role: "user", text: "Second question", isFinal: true },
      { role: "assistant", text: "Reply to second", isFinal: true },
    ]);
  });

  it("keeps a streaming reply together when the user transcript arrives after its first delta", async () => {
    const { session, channel } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    channel.emit({ type: "input_audio_buffer.committed", item_id: "user" });
    channel.emit({
      type: "response.output_audio_transcript.delta",
      item_id: "reply",
      delta: "Good ",
    });
    expect(onTranscript).not.toHaveBeenCalled();
    channel.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "user",
      transcript: "Hello",
    });
    channel.emit({
      type: "response.output_audio_transcript.delta",
      item_id: "reply",
      delta: "morning",
    });
    channel.emit({
      type: "response.output_audio_transcript.done",
      item_id: "reply",
      transcript: "Good morning",
    });
    expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
      { role: "user", text: "Hello", isFinal: true },
      { role: "assistant", text: "Good ", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: false },
      { role: "assistant", text: "Good morning", isFinal: true },
    ]);
  });

  it("releases replies after transcription failure and keeps the call usable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { session, channel } = await connected();
      const onTranscript = vi.fn();
      session.onTranscript(onTranscript);
      channel.emit({ type: "input_audio_buffer.committed", item_id: "user" });
      channel.emit({
        type: "response.output_audio_transcript.done",
        item_id: "reply",
        transcript: "Please repeat that",
      });
      channel.emit({
        type: "conversation.item.input_audio_transcription.failed",
        item_id: "user",
        error: { message: "Could not transcribe" },
      });
      channel.emit({ type: "response.done", response: { status: "failed" } });
      channel.emit({
        type: "error",
        error: {
          code: "conversation_already_has_active_response",
          message: "Already responding",
        },
      });
      expect(session.status.type).toBe("running");
      expect(onTranscript).toHaveBeenCalledWith({
        role: "assistant",
        text: "Please repeat that",
        isFinal: true,
      });
      expect(track.stop).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it.each(["session.created", "session.updated"])(
    "streams replies with transcription disabled by %s",
    async (type) => {
      const { session, channel } = await connected();
      const onTranscript = vi.fn();
      session.onTranscript(onTranscript);
      channel.emit({
        type,
        session: { audio: { input: { transcription: null } } },
      });
      channel.emit({ type: "input_audio_buffer.committed", item_id: "user" });
      channel.emit({
        type: "response.output_audio_transcript.delta",
        item_id: "reply",
        delta: "Hello",
      });
      channel.emit({
        type: "response.output_audio_transcript.done",
        item_id: "reply",
        transcript: "Hello!",
      });
      expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
        { role: "assistant", text: "Hello", isFinal: false },
        { role: "assistant", text: "Hello!", isFinal: true },
      ]);
    },
  );

  it.each([true, false])(
    "keeps an uninterrupted assistant message together when the next user transcript finishes early: %s",
    async (early) => {
      const { session, channel } = await connected();
      const onTranscript = vi.fn();
      session.onTranscript(onTranscript);
      channel.emit({
        type: "session.updated",
        session: {
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: { type: "server_vad", interrupt_response: false },
            },
          },
        },
      });
      channel.emit({
        type: "response.output_audio_transcript.delta",
        item_id: "reply",
        delta: "Good ",
      });
      channel.emit({
        type: "input_audio_buffer.committed",
        item_id: "next-user",
      });
      const user = {
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "next-user",
        transcript: "Next question",
      };
      if (early) channel.emit(user);
      channel.emit({
        type: "response.output_audio_transcript.delta",
        item_id: "reply",
        delta: "morning",
      });
      channel.emit({
        type: "response.output_audio_transcript.done",
        item_id: "reply",
        transcript: "Good morning",
      });
      if (!early) channel.emit(user);
      expect(onTranscript.mock.calls.map(([item]) => item)).toEqual([
        { role: "assistant", text: "Good ", isFinal: false },
        { role: "assistant", text: "Good morning", isFinal: false },
        { role: "assistant", text: "Good morning", isFinal: true },
        { role: "user", text: "Next question", isFinal: true },
      ]);
    },
  );

  it("waits for both typed item and response acceptance without echoing the transcript", async () => {
    const { session, channel } = await connected();
    const onTranscript = vi.fn();
    const accepted = vi.fn();
    session.onTranscript(onTranscript);
    channel.emit({ type: "response.created" });
    channel.emit({ type: "output_audio_buffer.started" });
    const sent = Promise.resolve(session.sendText!("Change the topic"));
    void sent.then(accepted);
    const events = channel.events();
    expect(events.map((event) => event.type)).toEqual([
      "response.cancel",
      "output_audio_buffer.clear",
      "conversation.item.create",
    ]);
    expect(events[2].item).toMatchObject({
      role: "user",
      content: [{ type: "input_text", text: "Change the topic" }],
    });
    expect(accepted).not.toHaveBeenCalled();
    channel.emit({
      type: "conversation.item.added",
      item: { id: "unrelated" },
    });
    expect(accepted).not.toHaveBeenCalled();
    channel.emit({
      type: "conversation.item.added",
      item: { id: events[2].item.id },
    });
    await vi.waitFor(() =>
      expect(channel.events().at(-1).type).toBe("response.create"),
    );
    expect(accepted).not.toHaveBeenCalled();
    channel.emit({
      type: "response.created",
      response: { metadata: { aui_request_id: "unrelated" } },
    });
    await Promise.resolve();
    expect(accepted).not.toHaveBeenCalled();
    const response = channel.events().at(-1);
    expect(response.response.metadata.aui_request_id).toBe(response.event_id);
    channel.emit({
      type: "response.created",
      response: { metadata: response.response.metadata },
    });
    await sent;
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("rejects a typed send whose response request fails after the item was accepted", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { session, channel } = await connected();
      const rejected = expect(session.sendText!("Hello")).rejects.toThrow(
        "Already responding",
      );
      const item = channel.events().at(-1);
      channel.emit({
        type: "conversation.item.added",
        item: { id: item.item.id },
      });
      await vi.waitFor(() =>
        expect(channel.events().at(-1).type).toBe("response.create"),
      );
      channel.emit({
        type: "error",
        error: {
          event_id: channel.events().at(-1).event_id,
          code: "conversation_already_has_active_response",
          message: "Already responding",
        },
      });
      await rejected;
      expect(session.status.type).toBe("running");
      expect(track.stop).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects a pending text send on disconnect", async () => {
    const { session } = await connected();
    const sent = session.sendText!("Hello");
    const rejected = expect(sent).rejects.toThrow(
      "disconnected before accepting",
    );
    session.disconnect();
    await rejected;
  });

  it.each(["disconnect", "timeout"])(
    "rejects a typed send on %s while waiting for response acceptance",
    async (failure) => {
      const { session, channel } = await connected();
      vi.useFakeTimers();
      const rejected = expect(session.sendText!("Hello")).rejects.toThrow(
        failure === "disconnect"
          ? "disconnected before accepting"
          : "did not acknowledge",
      );
      channel.emit({
        type: "conversation.item.added",
        item: { id: channel.events().at(-1).item.id },
      });
      await Promise.resolve();
      expect(channel.events().at(-1).type).toBe("response.create");
      if (failure === "disconnect") session.disconnect();
      else await vi.advanceTimersByTimeAsync(10_000);
      await rejected;
      session.disconnect();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("rejects an unacknowledged text send instead of committing it to history", async () => {
    const { session } = await connected();
    vi.useFakeTimers();
    const rejected = expect(session.sendText!("Hello")).rejects.toThrow(
      "did not acknowledge",
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
  });

  it("stops microphone capture, playback, timers, and WebRTC exactly once", async () => {
    vi.useFakeTimers();
    const { session, peer, channel } = await connected();
    peer.ontrack?.({ track: { kind: "audio" } });
    expect(audio.play).toHaveBeenCalledOnce();
    session.disconnect();
    session.disconnect();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.srcObject).toBeNull();
    expect(channel.close).toHaveBeenCalledOnce();
    expect(peer.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("mutes the microphone and excludes it from volume measurements", async () => {
    vi.useFakeTimers();
    const { session } = await connected();
    const onVolume = vi.fn();
    session.onVolumeChange(onVolume);
    await vi.advanceTimersByTimeAsync(100);
    expect(onVolume).toHaveBeenLastCalledWith(0.7);
    session.mute();
    expect(track.enabled).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(onVolume).toHaveBeenLastCalledWith(0.4);
    session.unmute();
    expect(track.enabled).toBe(true);
  });

  it("applies a mute requested while microphone permission is pending", async () => {
    const permission = deferred<typeof stream>();
    getUserMedia.mockReturnValue(permission.promise);
    const { session, peer } = start();
    session.mute();
    permission.resolve(stream);
    await vi.waitFor(() =>
      expect(peer.setRemoteDescription).toHaveBeenCalled(),
    );
    expect(track.enabled).toBe(false);
  });

  it("disposes immediately while microphone permission is pending and stops a late stream", async () => {
    const permission = deferred<typeof stream>();
    getUserMedia.mockReturnValue(permission.promise);
    const { session, peer } = start();
    session.disconnect();
    await vi.waitFor(() => expect(peer.close).toHaveBeenCalledOnce());
    permission.resolve(stream);
    await vi.waitFor(() => expect(track.stop).toHaveBeenCalledOnce());
    expect(exchangeSdp).not.toHaveBeenCalled();
  });

  it("aborts an in-flight SDP exchange without installing a late answer", async () => {
    const answer = deferred<string>();
    exchangeSdp.mockReturnValue(answer.promise);
    const controller = new AbortController();
    const { session, peer } = start(controller.signal);
    await vi.waitFor(() => expect(exchangeSdp).toHaveBeenCalled());
    const [, options] = exchangeSdp.mock.calls[0]!;
    controller.abort();
    expect(options.signal.aborted).toBe(true);
    expect(track.stop).toHaveBeenCalledOnce();
    answer.resolve("late-answer");
    await Promise.resolve();
    expect(peer.setRemoteDescription).not.toHaveBeenCalled();
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
  });

  it("cleans up on permission rejection", async () => {
    const error = new Error("Permission denied");
    getUserMedia.mockRejectedValue(error);
    const { session, peer } = start();
    await vi.waitFor(() =>
      expect(session.status).toEqual({ type: "ended", reason: "error", error }),
    );
    expect(peer.close).toHaveBeenCalledOnce();
    expect(exchangeSdp).not.toHaveBeenCalled();
  });

  it("cleans up on signaling rejection", async () => {
    const error = new Error("Unauthorized");
    exchangeSdp.mockRejectedValue(error);
    const { session, peer } = start();
    await vi.waitFor(() =>
      expect(session.status).toEqual({ type: "ended", reason: "error", error }),
    );
    expect(track.stop).toHaveBeenCalledOnce();
    expect(peer.close).toHaveBeenCalledOnce();
  });

  it("times out a connection whose channel never opens", async () => {
    vi.useFakeTimers();
    const { session, peer } = start();
    await vi.waitFor(() =>
      expect(peer.setRemoteDescription).toHaveBeenCalled(),
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(session.status).toMatchObject({ type: "ended", reason: "error" });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(peer.close).toHaveBeenCalledOnce();
  });

  it.each(["failed", "closed"])(
    "cleans up when the peer becomes %s",
    async (state) => {
      const { session, peer } = await connected();
      peer.connectionState = state;
      peer.onconnectionstatechange?.();
      expect(session.status).toMatchObject({
        type: "ended",
        reason: state === "failed" ? "error" : "finished",
      });
      expect(track.stop).toHaveBeenCalledOnce();
    },
  );

  it("rejects the affected message on a provider error without ending the call", async () => {
    const { session, channel } = await connected();
    const rejected = expect(session.sendText!("Hello")).rejects.toThrow();
    const id = channel.events().at(-1).event_id;
    channel.emit({
      type: "error",
      error: { event_id: id, message: "Invalid item" },
    });
    await rejected;
    expect(session.status.type).toBe("running");
    expect(track.stop).not.toHaveBeenCalled();
  });

  it("ignores malformed and unrelated events", async () => {
    const { session, channel } = await connected();
    const onTranscript = vi.fn();
    session.onTranscript(onTranscript);
    channel.onmessage?.({ data: "not-json" });
    for (const event of [
      null,
      [],
      {},
      { type: "session.updated" },
      { type: "response.output_audio_transcript.delta" },
      { type: "response.output_audio_transcript.done", item_id: "a" },
      { type: "conversation.item.input_audio_transcription.completed" },
    ])
      channel.emit(event);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(session.status.type).toBe("running");
  });

  it("reports unsupported environments through session status", async () => {
    vi.stubGlobal("RTCPeerConnection", undefined);
    const session = new OpenAIRealtimeVoiceAdapter({ exchangeSdp }).connect({});
    await vi.waitFor(() =>
      expect(session.status).toMatchObject({ type: "ended", reason: "error" }),
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("does not restart the volume meter when a status listener disconnects", async () => {
    vi.useFakeTimers();
    const { session, peer, channel } = start();
    await vi.waitFor(() =>
      expect(peer.setRemoteDescription).toHaveBeenCalled(),
    );
    session.onStatusChange((status) => {
      if (status.type === "running") session.disconnect();
    });
    channel.open();
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends the session when remote audio cannot be played", async () => {
    const { session, peer } = await connected();
    const error = new Error("Autoplay blocked");
    audio.play.mockRejectedValue(error);
    peer.ontrack?.({ track: { kind: "audio" } });
    await vi.waitFor(() =>
      expect(session.status).toEqual({ type: "ended", reason: "error", error }),
    );
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("does not allocate media for an already-aborted connection", () => {
    const session = new OpenAIRealtimeVoiceAdapter({ exchangeSdp }).connect({
      abortSignal: AbortSignal.abort(),
    });
    expect(session.status).toEqual({ type: "ended", reason: "cancelled" });
    expect(Peer.instances).toHaveLength(0);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
