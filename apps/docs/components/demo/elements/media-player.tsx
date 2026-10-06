"use client";

import {
  AudioPlayer,
  VideoPlayer,
} from "@/components/assistant-ui/elements/media-player";

export function AudioPlayerDemo() {
  return (
    <AudioPlayer
      src="/media/c-major-arpeggio.mp3"
      title="C major arpeggio"
      durationMs={5000}
    />
  );
}

export function VideoPlayerDemo() {
  return (
    <VideoPlayer
      src="/media/c-major-arpeggio.mp4"
      title="C major arpeggio, waveform"
      durationMs={5000}
      className="max-w-sm"
    />
  );
}
