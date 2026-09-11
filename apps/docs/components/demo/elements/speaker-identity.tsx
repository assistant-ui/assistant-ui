"use client";

import {
  SpeakerIdentity,
  type SpeakerTurn,
} from "@/components/assistant-ui/elements/speaker-identity";

const TURNS: readonly SpeakerTurn[] = [
  {
    id: "1",
    kind: "user",
    name: "You",
    text: "Find out why the converter drops turns.",
  },
  {
    id: "2",
    kind: "agent",
    name: "Maintainer",
    detail: "opus",
    text: "Splitting this: one worker reads the converter, one reads the tests.",
  },
  {
    id: "3",
    kind: "subagent",
    name: "reader",
    detail: "haiku",
    text: "convertMessages returns early when parts is empty.",
  },
  {
    id: "4",
    kind: "tool",
    name: "read_file",
    detail: "42ms",
    text: "packages/core/src/convertMessages.ts",
  },
];

export function SpeakerIdentityDemo() {
  return <SpeakerIdentity turns={TURNS} />;
}
