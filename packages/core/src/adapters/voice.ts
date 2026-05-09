import type { Unsubscribe } from "../types/unsubscribe";

export namespace RealtimeVoiceAdapter {
  export type Status =
    | {
        type: "starting" | "running";
      }
    | {
        type: "ended";
        reason: "finished" | "cancelled" | "error";
        error?: unknown;
      };

  export type Mode = "listening" | "speaking";

  export type TranscriptItem = {
    role: "user" | "assistant";
    text: string;
    isFinal?: boolean;
  };

  export type Session = {
    status: Status;
    isMuted: boolean;

    disconnect: () => void;
    mute: () => void;
    unmute: () => void;

    onStatusChange: (callback: (status: Status) => void) => Unsubscribe;
    onTranscript: (
      callback: (transcript: TranscriptItem) => void,
    ) => Unsubscribe;
    onModeChange: (callback: (mode: Mode) => void) => Unsubscribe;
    onVolumeChange: (callback: (volume: number) => void) => Unsubscribe;
  };
}

export type RealtimeVoiceAdapter = {
  connect: (options: {
    abortSignal?: AbortSignal;
  }) => RealtimeVoiceAdapter.Session;
};

export type VoiceSessionControls = {
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
};

export type VoiceSessionHelpers = {
  setStatus: (status: RealtimeVoiceAdapter.Status) => void;
  end: (reason: "finished" | "cancelled" | "error", error?: unknown) => void;
  emitTranscript: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
  emitMode: (mode: RealtimeVoiceAdapter.Mode) => void;
  emitVolume: (volume: number) => void;
  isDisposed: () => boolean;
};

export function createVoiceSession(
  options: { abortSignal?: AbortSignal },
  setup: (helpers: VoiceSessionHelpers) => Promise<VoiceSessionControls>,
): RealtimeVoiceAdapter.Session {
  const statusCbs = new Set<(s: RealtimeVoiceAdapter.Status) => void>();
  const transcriptCbs = new Set<
    (t: RealtimeVoiceAdapter.TranscriptItem) => void
  >();
  const modeCbs = new Set<(m: RealtimeVoiceAdapter.Mode) => void>();
  const volumeCbs = new Set<(v: number) => void>();

  let currentStatus: RealtimeVoiceAdapter.Status = { type: "starting" };
  let isMuted = false;
  let disposed = false;
  let controls: VoiceSessionControls | null = null;

  const cleanup = () => {
    disposed = true;
    statusCbs.clear();
    transcriptCbs.clear();
    modeCbs.clear();
    volumeCbs.clear();
  };

  const helpers: VoiceSessionHelpers = {
    setStatus: (status) => {
      if (disposed) return;
      currentStatus = status;
      for (const cb of statusCbs) cb(status);
    },
    end: (reason, error?) => {
      if (disposed) return;
      currentStatus = { type: "ended", reason, error };
      for (const cb of statusCbs) cb(currentStatus);
      cleanup();
    },
    emitTranscript: (item) => {
      if (disposed) return;
      for (const cb of transcriptCbs) cb(item);
    },
    emitMode: (mode) => {
      if (disposed) return;
      for (const cb of modeCbs) cb(mode);
    },
    emitVolume: (volume) => {
      if (disposed) return;
      for (const cb of volumeCbs) cb(volume);
    },
    isDisposed: () => disposed,
  };

  const session: RealtimeVoiceAdapter.Session = {
    get status() {
      return currentStatus;
    },
    get isMuted() {
      return isMuted;
    },
    disconnect: () => {
      controls?.disconnect();
      cleanup();
    },
    mute: () => {
      controls?.mute();
      isMuted = true;
    },
    unmute: () => {
      controls?.unmute();
      isMuted = false;
    },
    onStatusChange: (cb) => {
      statusCbs.add(cb);
      return () => statusCbs.delete(cb);
    },
    onTranscript: (cb) => {
      transcriptCbs.add(cb);
      return () => transcriptCbs.delete(cb);
    },
    onModeChange: (cb) => {
      modeCbs.add(cb);
      return () => modeCbs.delete(cb);
    },
    onVolumeChange: (cb) => {
      volumeCbs.add(cb);
      return () => volumeCbs.delete(cb);
    },
  };

  if (options.abortSignal) {
    options.abortSignal.addEventListener("abort", () => session.disconnect(), {
      once: true,
    });
  }

  const doSetup = async () => {
    try {
      if (disposed) return;
      controls = await setup(helpers);
      if (disposed) controls.disconnect();
    } catch (error) {
      helpers.end("error", error);
    }
  };

  doSetup();
  return session;
}
