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
    const room = new Room(this._roomOptions);
    let volumeInterval: ReturnType<typeof setInterval> | null = null;
    const attachedAudioElements = new Set<HTMLMediaElement>();
    let isCleanedUp = false;
    let abortHandler: (() => void) | undefined;

    const cleanupAudioElements = () => {
      for (const element of attachedAudioElements) element.remove();
      attachedAudioElements.clear();
    };

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (abortHandler) {
        options.abortSignal?.removeEventListener("abort", abortHandler);
        abortHandler = undefined;
      }
      if (volumeInterval) {
        clearInterval(volumeInterval);
        volumeInterval = null;
      }
      try {
        cleanupAudioElements();
      } finally {
        room.disconnect();
      }
    };

    const controls = {
      disconnect: cleanup,
      mute: () => {
        room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      },
      unmute: () => {
        room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
      },
    };

    const session = createVoiceSession(options, async (session) => {
      const attachRemoteAudio = (track: RemoteTrack) => {
        if (
          isCleanedUp ||
          session.isDisposed() ||
          track.kind !== Track.Kind.Audio
        )
          return;
        const element = track.attach();
        element.style.display = "none";
        document.body.appendChild(element);
        attachedAudioElements.add(element);
      };

      const detachRemoteAudio = (track: RemoteTrack) => {
        if (isCleanedUp || track.kind !== Track.Kind.Audio) return;
        for (const element of track.detach()) {
          element.remove();
          attachedAudioElements.delete(element);
        }
      };

      room.on(RoomEvent.TrackSubscribed, attachRemoteAudio);
      room.on(RoomEvent.TrackUnsubscribed, detachRemoteAudio);

      room.on(RoomEvent.Connected, () => {
        if (isCleanedUp || session.isDisposed()) return;
        session.setStatus({ type: "running" });
        if (volumeInterval) clearInterval(volumeInterval);
        volumeInterval = setInterval(() => {
          if (isCleanedUp || session.isDisposed()) return;
          const localLevel = room.localParticipant.audioLevel ?? 0;
          let remoteLevel = 0;
          for (const p of room.remoteParticipants.values()) {
            remoteLevel = Math.max(remoteLevel, p.audioLevel ?? 0);
          }
          session.emitVolume(Math.max(localLevel, remoteLevel));
        }, 100);
      });

      room.on(RoomEvent.Disconnected, () => {
        const wasCleanedUp = isCleanedUp;
        cleanup();
        if (!wasCleanedUp && !session.isDisposed()) {
          session.end("finished");
        }
      });
      room.on(RoomEvent.MediaDevicesError, (error) => {
        const wasCleanedUp = isCleanedUp;
        cleanup();
        if (!wasCleanedUp && !session.isDisposed()) {
          session.end("error", error);
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (isCleanedUp || session.isDisposed()) return;
        const remoteIsSpeaking = speakers.some(
          (s) => s !== room.localParticipant,
        );
        session.emitMode(remoteIsSpeaking ? "speaking" : "listening");
      });

      room.on(
        RoomEvent.TranscriptionReceived,
        (segments, participant, _publication) => {
          if (isCleanedUp || session.isDisposed()) return;
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
        if (session.isDisposed()) {
          cleanup();
          return controls;
        }

        await room.connect(this._url, token);
        if (session.isDisposed()) {
          cleanup();
          return controls;
        }

        await room.localParticipant.setMicrophoneEnabled(true);

        return controls;
      } catch (error) {
        cleanup();
        throw error;
      }
    });

    if (options.abortSignal) {
      abortHandler = () => cleanup();
      options.abortSignal.addEventListener("abort", abortHandler, {
        once: true,
      });
      if (options.abortSignal.aborted) cleanup();
    }

    return session;
  }
}
