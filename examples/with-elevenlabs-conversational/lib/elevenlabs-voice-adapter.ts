import type { RealtimeVoiceAdapter } from "@assistant-ui/react";
import { createVoiceSession } from "@assistant-ui/react";
import { VoiceConversation } from "@elevenlabs/client";

export type ElevenLabsVoiceAdapterOptions = {
  agentId: string;
};

export class ElevenLabsVoiceAdapter implements RealtimeVoiceAdapter {
  private _agentId: string;

  constructor(options: ElevenLabsVoiceAdapterOptions) {
    this._agentId = options.agentId;
  }

  connect(options: {
    abortSignal?: AbortSignal;
  }): RealtimeVoiceAdapter.Session {
    return createVoiceSession(options, async (session) => {
      let volumeInterval: ReturnType<typeof setInterval> | null = null;

      const conversation = await VoiceConversation.startSession({
        agentId: this._agentId,
        onConnect: () => {
          session.setStatus({ type: "running" });
          volumeInterval = setInterval(() => {
            if (session.isDisposed()) return;
            const vol = Math.max(
              conversation.getInputVolume(),
              conversation.getOutputVolume(),
            );
            session.emitVolume(vol);
          }, 50);
        },
        onDisconnect: () => {
          if (volumeInterval) clearInterval(volumeInterval);
          session.end("finished");
        },
        onError: (message) => {
          if (volumeInterval) clearInterval(volumeInterval);
          session.end("error", new Error(message));
        },
        onModeChange: ({ mode }) => {
          session.emitMode(mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: (message) => {
          session.emitTranscript({
            role: message.role === "user" ? "user" : "assistant",
            text: message.message,
            isFinal: true,
          });
        },
      });

      return {
        disconnect: () => {
          if (volumeInterval) clearInterval(volumeInterval);
          conversation.endSession();
        },
        mute: () => conversation.setMicMuted(true),
        unmute: () => conversation.setMicMuted(false),
      };
    });
  }
}
