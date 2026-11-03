"use client";

import {
  VoiceConversation,
  type VoiceTurn,
} from "@/components/assistant-ui/elements/voice-conversation";
import { defineStates } from "./types";

const noop = () => {};

const TRANSCRIPT: readonly VoiceTurn[] = [
  { id: "u1", role: "user", text: "What broke in the last deploy?" },
  {
    id: "a1",
    role: "assistant",
    text: "The converter dropped empty parts. I pushed a guard.",
  },
];

const controls = { onToggleMute: noop, onEnd: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "connecting",
    label: "Connecting",
    note: "The call is opening the mic and nothing has been said yet.",
    Component: () => (
      <VoiceConversation
        {...controls}
        mode="connecting"
        amplitude={0}
        transcript={[]}
      />
    ),
  },
  {
    key: "listening",
    label: "Listening",
    note: "The user is talking and the orb follows their voice level.",
    Component: () => (
      <VoiceConversation
        {...controls}
        mode="listening"
        amplitude={0.7}
        transcript={TRANSCRIPT.slice(0, 1)}
      />
    ),
  },
  {
    key: "thinking",
    label: "Thinking",
    note: "The user stopped talking and the reply is being prepared.",
    Component: () => (
      <VoiceConversation
        {...controls}
        mode="thinking"
        amplitude={0.15}
        transcript={TRANSCRIPT.slice(0, 1)}
      />
    ),
  },
  {
    key: "speaking",
    label: "Speaking",
    note: "The reply is playing and a tap on the orb interrupts it.",
    Component: () => (
      <VoiceConversation
        {...controls}
        onInterrupt={noop}
        mode="speaking"
        amplitude={0.6}
        transcript={TRANSCRIPT}
      />
    ),
  },
  {
    key: "muted",
    label: "Muted",
    note: "The mic is off, so the hint reads Mic off while the call stays open.",
    Component: () => (
      <VoiceConversation
        {...controls}
        muted
        mode="listening"
        amplitude={0}
        transcript={TRANSCRIPT}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long transcript",
    note: "Several long turns wrap inside the narrow call card.",
    Component: () => (
      <VoiceConversation
        {...controls}
        mode="listening"
        amplitude={0.4}
        transcript={[
          ...TRANSCRIPT,
          {
            id: "u2",
            role: "user",
            text: "Okay, and did that guard also cover the tool result parts, or only the text ones? I saw a blank bubble in staging this morning.",
          },
          {
            id: "a2",
            role: "assistant",
            text: "Only text parts. Tool results with no output still reach the renderer. I can extend the guard to skip them and add a test for the staging case.",
          },
        ]}
      />
    ),
  },
]);
