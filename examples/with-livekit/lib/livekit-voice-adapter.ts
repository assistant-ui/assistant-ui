import type { RealtimeVoiceAdapter } from "@assistant-ui/react";
import { createVoiceSession } from "@assistant-ui/react";
import { Room, RoomEvent, type RoomOptions } from "livekit-client";

export type LiveKitVoiceAdapterOptions = {
  url: string;
  token: string | (() => Promise<string>);
  roomOptions?: RoomOptions;
};

export class LiveKitVoiceAdapter implements RealtimeVoiceAdapter {
  private _url: string;
  private _token: string | (() => Promise<string>);
  private _roomOptions: RoomOptions | undefined;

  constructor(options: LiveKitVoiceAdapterOptions) {
    this._url = options.url;
    this._token = options.token;
    this._roomOptions = options.roomOptions;
  }

  connect(options: {
    abortSignal?: AbortSignal;
  }): RealtimeVoiceAdapter.Session {
    const room = new Room(this._roomOptions);

    return createVoiceSession(options, async (session) => {
      let volumeInterval: ReturnType<typeof setInterval> | null = null;

      room.on(RoomEvent.Connected, () => {
        session.setStatus({ type: "running" });
        if (volumeInterval) clearInterval(volumeInterval);
        volumeInterval = setInterval(() => {
          if (session.isDisposed()) return;
          const localLevel = room.localParticipant.audioLevel ?? 0;
          let remoteLevel = 0;
          for (const p of room.remoteParticipants.values()) {
            remoteLevel = Math.max(remoteLevel, p.audioLevel ?? 0);
          }
          session.emitVolume(Math.max(localLevel, remoteLevel));
        }, 100);
      });

      room.on(RoomEvent.Disconnected, () => {
        if (volumeInterval) clearInterval(volumeInterval);
        session.end("finished");
      });
      room.on(RoomEvent.MediaDevicesError, (error) => {
        if (volumeInterval) clearInterval(volumeInterval);
        session.end("error", error);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (session.isDisposed()) return;
        const remoteIsSpeaking = speakers.some(
          (s) => s !== room.localParticipant,
        );
        session.emitMode(remoteIsSpeaking ? "speaking" : "listening");
      });

      room.on(
        RoomEvent.TranscriptionReceived,
        (segments, participant, _publication) => {
          if (session.isDisposed()) return;
          const role =
            participant === room.localParticipant ? "user" : "assistant";
          for (const segment of segments) {
            session.emitTranscript({
              role,
              text: segment.text,
              isFinal: segment.final,
            });
          }
        },
      );

      const token =
        typeof this._token === "function" ? await this._token() : this._token;
      if (session.isDisposed())
        return { disconnect: () => {}, mute: () => {}, unmute: () => {} };

      await room.connect(this._url, token);
      if (session.isDisposed())
        return { disconnect: () => {}, mute: () => {}, unmute: () => {} };

      await room.localParticipant.setMicrophoneEnabled(true);

      return {
        disconnect: () => {
          if (volumeInterval) clearInterval(volumeInterval);
          room.disconnect();
        },
        mute: () => {
          room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        },
        unmute: () => {
          room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        },
      };
    });
  }
}
