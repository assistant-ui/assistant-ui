import {
  createVoiceSession,
  type RealtimeVoiceAdapter,
} from "@assistant-ui/core";
import {
  createPcmPlayer,
  openMicrophone,
  type MicrophoneCapture,
  type PcmPlayer,
} from "./gemini-live/audio";

/** Options for a browser WebSocket connection to the Gemini Live API. */
export type GeminiLiveVoiceAdapterOptions = {
  /** Return a short-lived ephemeral token minted by your authenticated server. Keep the API key and session configuration on the server. */
  getToken: (options: { signal: AbortSignal }) => Promise<string>;
  /** Live model to connect to, such as `gemini-3.8-live`; it must match the model your token was minted for. */
  model: string;
};

const ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * Connects browser microphone audio directly to the Gemini Live API over a
 * WebSocket. Configure the model, voice, and transcription on the server
 * through the ephemeral token's connection constraints. Each connection starts
 * a new conversation; existing thread history and assistant-ui tools are not
 * sent to the voice model, and sessions end when Google's session limit is
 * reached.
 */
export class GeminiLiveVoiceAdapter implements RealtimeVoiceAdapter {
  private readonly options: GeminiLiveVoiceAdapterOptions;

  constructor(options: GeminiLiveVoiceAdapterOptions) {
    this.options = options;
  }

  connect(options: {
    abortSignal?: AbortSignal;
  }): RealtimeVoiceAdapter.Session {
    return createVoiceSession(options, async (session) => {
      if (
        typeof WebSocket === "undefined" ||
        typeof AudioContext === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Gemini Live voice requires a browser with WebSockets, Web Audio, and microphone access.",
        );
      }

      const controller = new AbortController();
      let socket: WebSocket | undefined;
      let microphone: MicrophoneCapture | undefined;
      let player: PcmPlayer | undefined;
      let muted = false;
      let closed = false;
      let ready = false;
      let generating = false;
      let cancelled = false;
      let goingAway = false;
      let holdingAssistant = false;
      let assistantText = "";
      let userText = "";
      let userFinished = false;
      let nextUserText = "";
      let nextUserFinals: string[] = [];
      let deferred: Record<string, unknown>[] | undefined;
      let volumeTimer: ReturnType<typeof setInterval> | undefined;
      let connectionTimer: ReturnType<typeof setTimeout> | undefined;
      let pendingText:
        | {
            awaitingInterrupt: boolean;
            resolve: () => void;
            reject: (error: Error) => void;
            timer: ReturnType<typeof setTimeout>;
          }
        | undefined;

      const settleText = (error?: Error) => {
        if (!pendingText) return;
        clearTimeout(pendingText.timer);
        const { resolve, reject } = pendingText;
        pendingText = undefined;
        if (error) reject(error);
        else resolve();
      };

      const disconnect = () => {
        if (closed) return;
        closed = true;
        controller.abort();
        clearInterval(volumeTimer);
        clearTimeout(connectionTimer);
        deferred = undefined;
        settleText(
          new Error(
            "Gemini Live session disconnected before accepting the message.",
          ),
        );
        if (socket) {
          socket.onopen = socket.onmessage = socket.onclose = null;
          socket.onerror = null;
          if (
            socket.readyState === WebSocket.CONNECTING ||
            socket.readyState === WebSocket.OPEN
          )
            socket.close();
        }
        void microphone?.close().catch(() => {});
        void player?.close().catch(() => {});
      };

      const end = (reason: "finished" | "error", error?: unknown) => {
        if (ready && !closed) {
          finishTurn();
          flushUser();
        }
        session.end(reason, error);
        disconnect();
      };

      const send = (message: Record<string, unknown>) => {
        if (closed || !ready || socket?.readyState !== WebSocket.OPEN)
          throw new Error("Gemini Live session is not connected.");
        socket.send(JSON.stringify(message));
      };

      const flushUser = () => {
        userFinished = true;
        if (!userText) return;
        const text = userText;
        userText = "";
        session.emitTranscript({ role: "user", text, isFinal: true });
      };

      const emitAssistant = (isFinal: boolean) => {
        if (!assistantText || holdingAssistant) return;
        session.emitTranscript({
          role: "assistant",
          text: assistantText,
          isFinal,
        });
        if (isFinal) assistantText = "";
      };

      const stopPlayback = () => {
        if (!player?.isPlaying()) return;
        player.clear();
        session.emitMode("listening");
      };

      const releaseAssistant = () => {
        if (!holdingAssistant) return;
        flushUser();
        holdingAssistant = false;
        emitAssistant(false);
      };

      const startReply = (typed: boolean) => {
        generating = true;
        cancelled = false;
        holdingAssistant = !typed && !userFinished;
      };

      const finishTurn = () => {
        generating = false;
        holdingAssistant = false;
        flushUser();
        emitAssistant(true);
        for (const text of nextUserFinals)
          session.emitTranscript({ role: "user", text, isFinal: true });
        userFinished = nextUserFinals.length > 0 && !nextUserText;
        userText = nextUserText;
        nextUserText = "";
        nextUserFinals = [];
        if (pendingText) pendingText.awaitingInterrupt = false;
      };

      const handleContent = (content: Record<string, unknown>) => {
        const parts = asRecord(content.modelTurn)?.parts;
        const output = asRecord(content.outputTranscription)?.text;
        const input = asRecord(content.inputTranscription);
        const nextTurn = generating && !holdingAssistant;
        if (typeof input?.text === "string" && input.text) {
          if (nextTurn) nextUserText += input.text;
          else {
            if (!generating) userFinished = false;
            userText += input.text;
          }
        }
        if (input?.finished === true) {
          if (nextTurn) {
            if (nextUserText) nextUserFinals.push(nextUserText);
            nextUserText = "";
          } else if (generating) releaseAssistant();
          else flushUser();
        }
        if (content.interrupted === true) {
          stopPlayback();
          finishTurn();
          cancelled = true;
          return;
        }
        if (Array.isArray(parts) && !generating) startReply(false);
        if (generating) {
          if (Array.isArray(parts) && !pendingText?.awaitingInterrupt)
            for (const part of parts) {
              const data = asRecord(asRecord(part)?.inlineData)?.data;
              if (typeof data === "string" && player) {
                const wasPlaying = player.isPlaying();
                player.enqueue(data);
                if (!wasPlaying) session.emitMode("speaking");
              }
            }
          if (typeof output === "string" && output) {
            assistantText += output;
            emitAssistant(false);
          }
        }
        if (content.turnComplete === true) {
          if (cancelled) cancelled = false;
          else finishTurn();
        }
      };

      const routeContent = (content: Record<string, unknown>) => {
        if (deferred) {
          deferred.push(content);
          return;
        }
        if (
          pendingText &&
          !pendingText.awaitingInterrupt &&
          content.modelTurn !== undefined
        ) {
          const input = asRecord(content.inputTranscription)?.text;
          if (typeof input === "string") userText += input;
          flushUser();
          settleText();
          startReply(true);
          const queue = (deferred = [
            { ...content, inputTranscription: undefined },
          ]);
          setTimeout(() => {
            deferred = undefined;
            if (closed) return;
            try {
              for (const item of queue) routeContent(item);
            } catch (error) {
              end("error", error);
            }
          }, 0);
          return;
        }
        handleContent(content);
      };

      const handleMessage = (message: Record<string, unknown>) => {
        if (closed) return;
        if (message.setupComplete !== undefined) {
          if (ready) return;
          ready = true;
          clearTimeout(connectionTimer);
          session.setStatus({ type: "running" });
          if (closed) return;
          session.emitMode("listening");
          if (closed) return;
          volumeTimer = setInterval(() => {
            if (closed) return;
            session.emitVolume(
              Math.min(
                1,
                Math.max(
                  muted ? 0 : (microphone?.level() ?? 0),
                  player?.level() ?? 0,
                ),
              ),
            );
          }, 100);
          return;
        }
        const content = asRecord(message.serverContent);
        if (!content) {
          const goAway = asRecord(message.goAway);
          if (goAway) {
            goingAway = true;
            console.warn("Gemini Live session is closing.", goAway.timeLeft);
          }
          return;
        }
        routeContent(content);
      };

      const open = (token: string) => {
        socket = new WebSocket(`${ENDPOINT}?access_token=${token}`);
        socket.binaryType = "arraybuffer";
        const decoder = new TextDecoder();
        socket.onopen = () => {
          if (closed) return;
          socket?.send(
            JSON.stringify({
              setup: {
                model: `models/${this.options.model}`,
                generationConfig: { responseModalities: ["AUDIO"] },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
            }),
          );
        };
        socket.onmessage = ({ data }) => {
          let message: Record<string, unknown> | undefined;
          try {
            message = asRecord(
              JSON.parse(
                typeof data === "string" ? data : decoder.decode(data),
              ),
            );
          } catch {
            return;
          }
          if (!message) return;
          try {
            handleMessage(message);
          } catch (error) {
            end("error", error);
          }
        };
        socket.onclose = ({ code, reason }) => {
          if (ready) {
            if (code === 1000 || goingAway) end("finished");
            else
              end(
                "error",
                new Error(
                  `Gemini Live connection closed (${code}${reason ? `: ${reason}` : ""}).`,
                ),
              );
          } else
            end(
              "error",
              new Error(
                `Gemini Live connection closed before setup completed (${code}${reason ? `: ${reason}` : ""}).`,
              ),
            );
        };
        socket.onerror = () =>
          end("error", new Error("Gemini Live connection failed."));
      };

      const start = async () => {
        player = createPcmPlayer({
          sampleRate: OUTPUT_RATE,
          onIdle: () => {
            if (!closed) session.emitMode("listening");
          },
        });
        const capture = await openMicrophone({
          sampleRate: INPUT_RATE,
          signal: controller.signal,
          onChunk: (data) => {
            if (closed || !ready || socket?.readyState !== WebSocket.OPEN)
              return;
            socket.send(
              JSON.stringify({
                realtimeInput: {
                  audio: { data, mimeType: `audio/pcm;rate=${INPUT_RATE}` },
                },
              }),
            );
          },
        });
        if (closed || session.isDisposed()) {
          void capture.close().catch(() => {});
          return;
        }
        microphone = capture;
        capture.setMuted(muted);
        connectionTimer = setTimeout(
          () => end("error", new Error("Gemini Live connection timed out.")),
          30_000,
        );
        const token = await this.options.getToken({
          signal: controller.signal,
        });
        if (closed) return;
        open(token);
      };
      void start().catch((error: unknown) => end("error", error));

      return {
        disconnect,
        mute: () => {
          muted = true;
          microphone?.setMuted(true);
          if (ready && socket?.readyState === WebSocket.OPEN)
            send({ realtimeInput: { audioStreamEnd: true } });
        },
        unmute: () => {
          muted = false;
          microphone?.setMuted(false);
        },
        sendText: (text) =>
          new Promise<void>((resolve, reject) => {
            settleText(
              new Error("Gemini Live replaced the message with a newer one."),
            );
            send({
              clientContent: {
                turns: [{ role: "user", parts: [{ text }] }],
                turnComplete: true,
              },
            });
            stopPlayback();
            pendingText = {
              awaitingInterrupt: generating,
              resolve,
              reject,
              timer: setTimeout(() => {
                settleText(
                  new Error(
                    "Gemini Live did not start a reply to the message.",
                  ),
                );
              }, 10_000),
            };
          }),
      };
    });
  }
}
