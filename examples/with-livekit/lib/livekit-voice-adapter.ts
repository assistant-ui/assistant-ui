import type { RealtimeVoiceAdapter } from "@assistant-ui/react";
import { createVoiceSession } from "@assistant-ui/react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RoomOptions,
} from "livekit-client";

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
    return createVoiceSession(options, async (session) => {
      const room = new Room(this._roomOptions);
      let volumeInterval: ReturnType<typeof setInterval> | null = null;
      const attachedAudioElements = new Set<HTMLMediaElement>();
      let disconnected = false;

      const attachRemoteAudio = (track: RemoteTrack) => {
        if (
          session.isDisposed() ||
          disconnected ||
          track.kind !== Track.Kind.Audio
        )
          return;
        const element = track.attach();
        element.style.display = "none";
        document.body.appendChild(element);
        attachedAudioElements.add(element);
      };

      const detachRemoteAudio = (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        for (const element of track.detach()) {
          element.remove();
          attachedAudioElements.delete(element);
        }
      };

      const cleanupAudioElements = () => {
        for (const element of attachedAudioElements) element.remove();
        attachedAudioElements.clear();
      };

      const disconnect = () => {
        if (disconnected) return;
        disconnected = true;
        if (volumeInterval) clearInterval(volumeInterval);
        try {
          cleanupAudioElements();
        } finally {
          room.disconnect().catch((error) => {
            console.error("Failed to disconnect LiveKit room:", error);
          });
        }
      };

      const controls = {
        disconnect,
        mute: () => {
          room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        },
        unmute: () => {
          room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        },
      };

      room.on(RoomEvent.TrackSubscribed, attachRemoteAudio);
      room.on(RoomEvent.TrackUnsubscribed, detachRemoteAudio);

      room.on(RoomEvent.Connected, () => {
        if (session.isDisposed() || disconnected) return;
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
        session.end("finished");
        disconnect();
      });
      room.on(RoomEvent.MediaDevicesError, (error) => {
        session.end("error", error);
        disconnect();
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

      try {
        const token =
          typeof this._token === "function" ? await this._token() : this._token;
        if (session.isDisposed()) return controls;

        await room.connect(this._url, token);
        if (session.isDisposed()) return controls;

        await room.localParticipant.setMicrophoneEnabled(true);
        return controls;
      } catch (error) {
        session.end("error", error);
        disconnect();
        throw error;
      }
    });
  }
}
