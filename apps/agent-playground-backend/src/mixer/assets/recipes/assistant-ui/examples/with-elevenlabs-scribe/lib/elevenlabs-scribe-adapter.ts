import type { DictationAdapter } from "@assistant-ui/react";
import { Scribe, RealtimeEvents } from "@elevenlabs/client";

/**
 * ElevenLabs Scribe v2 Realtime Adapter for Speech-to-Text
 *
 * Uses ElevenLabs Scribe v2 Realtime for real-time transcription via WebSocket.
 * Provides ultra-low latency (~150ms) transcription with support for 90+ languages.
 *
 * @see https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming
 */
export class ElevenLabsScribeAdapter implements DictationAdapter {
  private tokenEndpoint: string;
  private languageCode: string;
  public disableInputDuringDictation: boolean;

  constructor(options: {
    tokenEndpoint: string;
    languageCode?: string;
    /**
     * Whether to disable text input while listening.
     * ElevenLabs Scribe returns cumulative transcripts that conflict
     * with simultaneous typing.
     * @default true
     */
    disableInputDuringDictation?: boolean;
  }) {
    this.tokenEndpoint = options.tokenEndpoint;
    this.languageCode = options.languageCode ?? "en";
    this.disableInputDuringDictation =
      options.disableInputDuringDictation ?? true;
  }

  listen(): DictationAdapter.Session {
    const callbacks = {
      start: new Set<() => void>(),
      end: new Set<(result: DictationAdapter.Result) => void>(),
      speech: new Set<(result: DictationAdapter.Result) => void>(),
    };

    let connection: ReturnType<typeof Scribe.connect> | null = null;
    let fullTranscript = "";

    const session: DictationAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        if (connection) {
          connection.commit();
          await new Promise((resolve) => setTimeout(resolve, 500));
          connection.close();
          connection = null;
        }
        (session as { status: DictationAdapter.Status }).status = {
          type: "ended",
          reason: "stopped",
        };
        if (fullTranscript) {
          for (const cb of callbacks.end) cb({ transcript: fullTranscript });
        }
      },

      cancel: () => {
        if (connection) {
          connection.close();
          connection = null;
        }
        (session as { status: DictationAdapter.Status }).status = {
          type: "ended",
          reason: "cancelled",
        };
      },

      onSpeechStart: (callback: () => void) => {
        callbacks.start.add(callback);
        return () => {
          callbacks.start.delete(callback);
        };
      },

      onSpeechEnd: (callback: (result: DictationAdapter.Result) => void) => {
        callbacks.end.add(callback);
        return () => {
          callbacks.end.delete(callback);
        };
      },

      onSpeech: (callback: (result: DictationAdapter.Result) => void) => {
        callbacks.speech.add(callback);
        return () => {
          callbacks.speech.delete(callback);
        };
      },
    };

    this.connect(session, callbacks, {
      setConnection: (conn) => {
        connection = conn;
      },
      getFullTranscript: () => fullTranscript,
      setFullTranscript: (t: string) => {
        fullTranscript = t;
      },
    });

    return session;
  }

  private async connect(
    session: DictationAdapter.Session,
    callbacks: {
      start: Set<() => void>;
      end: Set<(result: DictationAdapter.Result) => void>;
      speech: Set<(result: DictationAdapter.Result) => void>;
    },
    refs: {
      setConnection: (conn: ReturnType<typeof Scribe.connect>) => void;
      getFullTranscript: () => string;
      setFullTranscript: (t: string) => void;
    },
  ) {
    try {
      const tokenResponse = await fetch(this.tokenEndpoint, {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get token: ${tokenResponse.statusText}`);
      }

      const { token } = await tokenResponse.json();

      const currentStatus = (session as { status: DictationAdapter.Status })
        .status;
      if (currentStatus.type === "ended") {
        // Session was cancelled or stopped before the connection was created.
        // Avoid opening a new microphone session in this case.
        return;
      }

      const connection = Scribe.connect({
        token,
        modelId: "scribe_v2_realtime",
        languageCode: this.languageCode,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      refs.setConnection(connection);

      connection.on(RealtimeEvents.SESSION_STARTED, () => {
        (session as { status: DictationAdapter.Status }).status = {
          type: "running",
        };
        for (const cb of callbacks.start) cb();
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
        if (data.text) {
          for (const cb of callbacks.speech)
            cb({ transcript: data.text, isFinal: false });
        }
      });

      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
        if (data.text?.trim()) {
          refs.setFullTranscript(`${refs.getFullTranscript()}${data.text} `);
          for (const cb of callbacks.speech)
            cb({ transcript: data.text, isFinal: true });
        }
      });

      connection.on(RealtimeEvents.CLOSE, () => {
        const currentStatus = (
          session as {
            status: DictationAdapter.Status;
          }
        ).status;

        if (currentStatus.type !== "ended") {
          (session as { status: DictationAdapter.Status }).status = {
            type: "ended",
            reason: "stopped",
          };
        }

        const transcript = refs.getFullTranscript().trim();
        if (transcript) {
          for (const cb of callbacks.end) cb({ transcript });
        }
      });

      connection.on(RealtimeEvents.ERROR, (error) => {
        console.error("ElevenLabs Scribe error:", error);
        (session as { status: DictationAdapter.Status }).status = {
          type: "ended",
          reason: "error",
        };
      });

      connection.on(RealtimeEvents.AUTH_ERROR, (data) => {
        console.error("ElevenLabs Scribe auth error:", data.error);
        (session as { status: DictationAdapter.Status }).status = {
          type: "ended",
          reason: "error",
        };
      });
    } catch (error) {
      console.error("ElevenLabs Scribe connection failed:", error);
      (session as { status: DictationAdapter.Status }).status = {
        type: "ended",
        reason: "error",
      };
    }
  }
}
