"use client";

import {
  AudioPlayer,
  VideoPlayer,
} from "@/components/assistant-ui/elements/media-player";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "error",
    label: "Can't play",
    note: "The source failed to load, so playback and seeking are disabled.",
    Component: () => (
      <AudioPlayer
        src="/media/standup-recording-2026-09-26.mp3"
        title="Standup recording"
        durationMs={912_000}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long title",
    note: "A title longer than the player truncates.",
    Component: () => (
      <AudioPlayer
        src="/media/c-major-arpeggio.mp3"
        title="C major arpeggio, generated at 120 bpm with a soft piano voice and a short tail"
        durationMs={5000}
      />
    ),
  },
  {
    key: "portrait-video",
    label: "Portrait video",
    note: "A 9:16 video keeps its frame and letterboxes the content.",
    Component: () => (
      <VideoPlayer
        src="/media/c-major-arpeggio.mp4"
        title="C major arpeggio, waveform"
        ratio="9:16"
        durationMs={5000}
        className="max-w-[200px]"
      />
    ),
  },
  {
    key: "untitled-video",
    label: "No title",
    note: "A video sent without a title shows only its length under the frame.",
    Component: () => (
      <VideoPlayer src="/media/c-major-arpeggio.mp4" className="max-w-sm" />
    ),
  },
]);
