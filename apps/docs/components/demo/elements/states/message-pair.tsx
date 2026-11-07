"use client";

import { MessagePair } from "@/components/assistant-ui/elements/message-pair";
import { defineStates } from "./types";

const noop = () => {};

const USER_MESSAGE = "How do I persist composer drafts across threads?";
const WORDS =
  "Key the draft by thread id inside the runtime, hydrate the composer when a thread becomes active, and drop the entry after the message sends.".split(
    " ",
  );

const base = {
  userMessage: USER_MESSAGE,
  words: WORDS,
  onCopy: noop,
  onRegenerate: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "pending",
    label: "Waiting",
    note: "The question is sent and the reply has no words yet.",
    Component: () => <MessagePair {...base} visibleWords={0} streaming />,
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "The reply is partway in, with the newest words still in blue.",
    Component: () => <MessagePair {...base} visibleWords={11} streaming />,
  },
  {
    key: "success",
    label: "Complete",
    note: "The reply finished, and its actions show on hover or focus.",
    Component: () => (
      <MessagePair {...base} visibleWords={WORDS.length} streaming={false} />
    ),
  },
  {
    key: "long-content",
    label: "Long question",
    note: "A multi-sentence question wraps inside the bubble at 85% width.",
    Component: () => (
      <MessagePair
        {...base}
        userMessage="We run a remote thread list backed by Postgres and users switch threads constantly on mobile. How do I persist composer drafts across threads so a half-written message survives a reload, a thread switch, and a dropped connection?"
        visibleWords={WORDS.length}
        streaming={false}
      />
    ),
  },
]);
