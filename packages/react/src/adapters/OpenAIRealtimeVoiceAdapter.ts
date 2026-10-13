import {
  createVoiceSession,
  type RealtimeVoiceAdapter,
} from "@assistant-ui/core";

/** Options for a browser WebRTC connection to OpenAI Realtime. */
export type OpenAIRealtimeVoiceAdapterOptions = {
  /** Exchange the browser's SDP offer for an answer through your authenticated server. Keep the API key and session configuration on the server. */
  exchangeSdp: (
    sdp: string,
    options: { signal: AbortSignal },
  ) => Promise<string>;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * Connects browser microphone audio directly to OpenAI Realtime over WebRTC.
 * Configure audio output, input transcription, and automatic turn detection on
 * the server. Each connection starts a new conversation; existing thread history
 * and assistant-ui tools are not sent to the voice model.
 */
export class OpenAIRealtimeVoiceAdapter implements RealtimeVoiceAdapter {
  private readonly options: OpenAIRealtimeVoiceAdapterOptions;

  constructor(options: OpenAIRealtimeVoiceAdapterOptions) {
    this.options = options;
  }

  connect(options: {
    abortSignal?: AbortSignal;
  }): RealtimeVoiceAdapter.Session {
    return createVoiceSession(options, async (session) => {
      if (
        typeof RTCPeerConnection === "undefined" ||
        typeof document === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "OpenAI Realtime voice requires a browser with WebRTC and microphone access.",
        );
      }

      const controller = new AbortController();
      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel("oai-events");
      const audio = document.createElement("audio");
      audio.autoplay = true;
      let microphone: MediaStream | undefined;
      let muted = false;
      let closed = false;
      let generating = false;
      let speaking = false;
      let transcript = "";
      let transcriptItem: string | undefined;
      let volumeTimer: ReturnType<typeof setInterval> | undefined;
      let connectionTimer: ReturnType<typeof setTimeout> | undefined;
      type Transcript = {
        ready: boolean;
        value: RealtimeVoiceAdapter.TranscriptItem | undefined;
      };
      const transcriptQueue: Transcript[] = [];
      const pendingTranscripts = new Map<string, Transcript>();
      const flushTranscripts = () => {
        while (transcriptQueue[0]?.ready) {
          const { value } = transcriptQueue.shift()!;
          if (value) session.emitTranscript(value);
        }
      };
      const emitTranscript = (value: RealtimeVoiceAdapter.TranscriptItem) => {
        transcriptQueue.push({ ready: true, value });
        flushTranscripts();
      };
      const finishUserTranscript = (
        id: unknown,
        value?: RealtimeVoiceAdapter.TranscriptItem,
      ) => {
        const item =
          typeof id === "string" ? pendingTranscripts.get(id) : undefined;
        if (item) {
          item.ready = true;
          item.value = value;
          pendingTranscripts.delete(id as string);
          flushTranscripts();
        } else if (value) emitTranscript(value);
      };
      const pending = new Map<
        string,
        {
          resolve: () => void;
          reject: (error: Error) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      >();

      const disconnect = () => {
        if (closed) return;
        closed = true;
        controller.abort();
        clearInterval(volumeTimer);
        clearTimeout(connectionTimer);
        for (const item of pending.values()) {
          clearTimeout(item.timer);
          item.reject(
            new Error(
              "OpenAI Realtime session disconnected before accepting the message.",
            ),
          );
        }
        pending.clear();
        pendingTranscripts.clear();
        transcriptQueue.length = 0;
        channel.onopen =
          channel.onmessage =
          channel.onclose =
          channel.onerror =
            null;
        peer.ontrack = peer.onconnectionstatechange = null;
        for (const track of microphone?.getTracks() ?? []) track.stop();
        audio.pause();
        audio.srcObject = null;
        channel.close();
        peer.close();
      };

      const end = (reason: "finished" | "error", error?: unknown) => {
        session.end(reason, error);
        disconnect();
      };

      const send = (event: Record<string, unknown>) => {
        if (closed || channel.readyState !== "open") {
          throw new Error("OpenAI Realtime session is not connected.");
        }
        channel.send(JSON.stringify(event));
      };

      const setSpeaking = (value: boolean) => {
        speaking = value;
        session.emitMode(value ? "speaking" : "listening");
      };

      channel.onmessage = ({ data }) => {
        if (closed) return;
        let event: Record<string, unknown> | undefined;
        try {
          event = asRecord(JSON.parse(data));
        } catch {
          return;
        }
        if (!event) return;
        switch (event.type) {
          case "input_audio_buffer.committed":
            if (
              typeof event.item_id === "string" &&
              !pendingTranscripts.has(event.item_id)
            ) {
              const item = { ready: false, value: undefined };
              pendingTranscripts.set(event.item_id, item);
              transcriptQueue.push(item);
            }
            break;
          case "conversation.item.input_audio_transcription.completed":
            if (typeof event.transcript === "string") {
              finishUserTranscript(event.item_id, {
                role: "user",
                text: event.transcript,
                isFinal: true,
              });
            }
            break;
          case "response.output_audio_transcript.delta":
          case "response.output_audio_transcript.done": {
            if (typeof event.item_id !== "string") break;
            if (transcriptItem !== event.item_id) {
              transcriptItem = event.item_id;
              transcript = "";
            }
            const final =
              event.type === "response.output_audio_transcript.done";
            if (final) {
              if (typeof event.transcript !== "string") break;
              transcript = event.transcript;
            } else {
              if (typeof event.delta !== "string") break;
              transcript += event.delta;
            }
            emitTranscript({
              role: "assistant",
              text: transcript,
              isFinal: final,
            });
            break;
          }
          case "response.created":
            generating = true;
            break;
          case "response.done": {
            generating = false;
            const response = asRecord(event.response);
            if (response?.status === "failed") {
              console.warn(
                "OpenAI Realtime response failed.",
                response.status_details,
              );
            }
            break;
          }
          case "output_audio_buffer.started":
            setSpeaking(true);
            break;
          case "output_audio_buffer.stopped":
          case "output_audio_buffer.cleared":
            setSpeaking(false);
            break;
          case "conversation.item.added": {
            const item = asRecord(event.item);
            if (typeof item?.id !== "string") break;
            const message = pending.get(item.id);
            if (!message) break;
            clearTimeout(message.timer);
            pending.delete(item.id);
            message.resolve();
            break;
          }
          case "conversation.item.input_audio_transcription.failed":
            finishUserTranscript(event.item_id);
            console.warn("OpenAI Realtime transcription failed.", event.error);
            break;
          case "error": {
            const error = asRecord(event.error);
            if (error?.code === "response_cancel_not_active") break;
            const requestId =
              typeof error?.event_id === "string" ? error.event_id : "";
            const message = pending.get(requestId);
            if (message) {
              clearTimeout(message.timer);
              pending.delete(requestId);
              message.reject(
                new Error(
                  typeof error?.message === "string"
                    ? error.message
                    : "OpenAI Realtime rejected the message.",
                ),
              );
            } else console.warn("OpenAI Realtime error.", event.error);
            break;
          }
        }
      };
      channel.onopen = () => {
        if (closed) return;
        clearTimeout(connectionTimer);
        session.setStatus({ type: "running" });
        if (closed) return;
        session.emitMode("listening");
        if (closed) return;
        volumeTimer = setInterval(() => {
          void peer
            .getStats()
            .then((report) => {
              if (closed) return;
              let volume = 0;
              report.forEach((stat) => {
                if (
                  (stat.type === "inbound-rtp" ||
                    (!muted && stat.type === "media-source")) &&
                  typeof stat.audioLevel === "number"
                )
                  volume = Math.max(volume, stat.audioLevel);
              });
              session.emitVolume(Math.min(1, volume));
            })
            .catch(() => {});
        }, 100);
      };
      channel.onclose = () => end("finished");
      channel.onerror = () =>
        end("error", new Error("OpenAI Realtime data channel failed."));
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          end("error", new Error("OpenAI Realtime connection failed."));
        } else if (peer.connectionState === "closed") {
          end("finished");
        }
      };
      peer.ontrack = ({ track }) => {
        if (closed || track.kind !== "audio") return;
        audio.srcObject = new MediaStream([track]);
        void audio.play().catch((error: unknown) => end("error", error));
      };

      const start = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (closed || session.isDisposed()) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        microphone = stream;
        for (const track of stream.getAudioTracks()) {
          track.enabled = !muted;
          peer.addTrack(track, stream);
        }
        connectionTimer = setTimeout(
          () =>
            end("error", new Error("OpenAI Realtime connection timed out.")),
          30_000,
        );
        const offer = await peer.createOffer();
        if (closed) return;
        await peer.setLocalDescription(offer);
        if (closed) return;
        const answer = await this.options.exchangeSdp(offer.sdp!, {
          signal: controller.signal,
        });
        if (closed) return;
        await peer.setRemoteDescription({ type: "answer", sdp: answer });
      };
      void start().catch((error: unknown) => end("error", error));

      return {
        disconnect,
        mute: () => {
          muted = true;
          for (const track of microphone?.getAudioTracks() ?? [])
            track.enabled = false;
        },
        unmute: () => {
          muted = false;
          for (const track of microphone?.getAudioTracks() ?? [])
            track.enabled = true;
        },
        sendText: async (text) => {
          if (generating) send({ type: "response.cancel" });
          if (speaking) send({ type: "output_audio_buffer.clear" });
          const id = crypto.randomUUID().replaceAll("-", "");
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              pending.delete(id);
              reject(
                new Error("OpenAI Realtime did not acknowledge the message."),
              );
            }, 10_000);
            pending.set(id, { resolve, reject, timer });
            try {
              send({
                type: "conversation.item.create",
                event_id: id,
                item: {
                  id,
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text }],
                },
              });
            } catch (error) {
              clearTimeout(timer);
              pending.delete(id);
              reject(error);
            }
          });
          send({ type: "response.create" });
        },
      };
    });
  }
}
