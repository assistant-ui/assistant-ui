"use client";

import {
  SharedConversation,
  type SharedTurn,
} from "@/components/assistant-ui/elements/shared-conversation";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "No turns",
    note: "A shared link whose conversation has no messages.",
    Component: () => (
      <SharedConversation
        title="Untitled conversation"
        sharedBy="harry"
        sharedAt="just now"
        turns={[]}
        onContinue={noop}
      />
    ),
  },
  {
    key: "single-turn",
    label: "Question only",
    note: "The link was shared before the assistant replied.",
    Component: () => (
      <SharedConversation
        title="Converter drops empty parts"
        sharedBy="simon"
        sharedAt="5 minutes ago"
        turns={[
          {
            id: "1",
            role: "user",
            text: "Why does the converter drop tool calls with an empty args object?",
          },
        ]}
        onContinue={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long thread",
    note: "A long title and several long turns inside the same width.",
    Component: () => {
      const turns: readonly SharedTurn[] = [
        {
          id: "1",
          role: "user",
          text: "Why did the draft survive the thread switch, and why only on remote threads loaded after a reload?",
        },
        {
          id: "2",
          role: "assistant",
          text: "The composer read a slot keyed by the old thread id. Remote threads get their id after the list hydrates, so for one render the composer still pointed at the previous slot and copied its text forward.",
        },
        {
          id: "3",
          role: "user",
          text: "So clearing the slot on switch is enough?",
        },
        {
          id: "4",
          role: "assistant",
          text: "Clearing it fixes the symptom. Keying the slot by the remote id once it resolves fixes the cause, and a regression test covers the reload path.",
        },
      ];
      return (
        <SharedConversation
          title="Draft restore across threads after a reload on remote thread lists"
          sharedBy="harry.mitchell@assistant-ui.com"
          sharedAt="Oct 28, 2026"
          turns={turns}
          onContinue={noop}
        />
      );
    },
  },
]);
