"use client";

import { ReadAloud } from "@/components/assistant-ui/elements/read-aloud";
import { defineStates } from "./types";

const noop = () => {};

const WORDS =
  "The converter dropped parts with no text, so the guard now keeps them and the suite passes again.".split(
    " ",
  );

const controls = { words: WORDS, onToggle: noop, onRateChange: noop };

const LONG_WORDS =
  "The deploy failed because the message converter dropped parts that had no text. Tool results with an empty output were removed before the renderer saw them, so the thread showed a blank bubble and the snapshot tests failed. I added a guard that keeps empty parts, covered the tool result case in a new test, and the full suite passes again on main. The fix is in the latest canary, and the stable release goes out tomorrow morning.".split(
    " ",
  );

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "ready",
    label: "Not started",
    note: "Playback has not started, so no word is spoken yet.",
    Component: () => (
      <ReadAloud
        {...controls}
        spokenIndex={0}
        playing={false}
        rate={1}
        elapsed="0:00"
        duration="0:05"
      />
    ),
  },
  {
    key: "playing",
    label: "Playing",
    note: "Midway through, with the current word lit.",
    Component: () => (
      <ReadAloud
        {...controls}
        spokenIndex={9}
        playing
        rate={1}
        elapsed="0:02"
        duration="0:05"
      />
    ),
  },
  {
    key: "paused",
    label: "Paused",
    note: "Paused partway, holding the spoken word and position.",
    Component: () => (
      <ReadAloud
        {...controls}
        spokenIndex={12}
        playing={false}
        rate={1}
        elapsed="0:03"
        duration="0:05"
      />
    ),
  },
  {
    key: "fast",
    label: "Double speed",
    note: "Playing at 2x, which halves the duration.",
    Component: () => (
      <ReadAloud
        {...controls}
        spokenIndex={6}
        playing
        rate={2}
        elapsed="0:01"
        duration="0:02"
      />
    ),
  },
  {
    key: "success",
    label: "Finished",
    note: "Every word has been read and the bar is full.",
    Component: () => (
      <ReadAloud
        {...controls}
        spokenIndex={WORDS.length}
        playing={false}
        rate={1}
        elapsed="0:05"
        duration="0:05"
      />
    ),
  },
  {
    key: "long-content",
    label: "Long answer",
    note: "A long answer wraps over many lines while the current word stays lit.",
    Component: () => (
      <ReadAloud
        {...controls}
        words={LONG_WORDS}
        spokenIndex={31}
        playing
        rate={1.25}
        elapsed="0:07"
        duration="0:16"
      />
    ),
  },
]);
