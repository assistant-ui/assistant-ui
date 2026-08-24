"use client";

import {
  SharedConversation,
  type SharedTurn,
} from "@/components/elements/shared-conversation";

const TURNS: readonly SharedTurn[] = [
  {
    id: "1",
    role: "user",
    text: "Why did the draft survive the thread switch?",
  },
  {
    id: "2",
    role: "assistant",
    text: "The composer read a slot keyed by the old thread. Clearing it on switch fixes it at the source.",
  },
];

export function SharedConversationDemo() {
  return (
    <SharedConversation
      title="Draft restore across threads"
      sharedBy="harry"
      sharedAt="2 days ago"
      turns={TURNS}
    />
  );
}
