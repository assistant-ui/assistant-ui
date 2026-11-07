"use client";

import { MessageActions } from "@/components/assistant-ui/elements/message-actions";
import { defineStates } from "./types";

const noop = () => {};

const handlers = {
  onCopy: noop,
  onReactionChange: noop,
  onRegenerate: noop,
  onMore: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "copied",
    label: "Copied",
    note: "The copy button swaps to a check right after a copy.",
    Component: () => (
      <MessageActions
        {...handlers}
        copied
        reaction={null}
        regenerating={false}
      />
    ),
  },
  {
    key: "helpful",
    label: "Helpful",
    note: "The user marked the response helpful.",
    Component: () => (
      <MessageActions
        {...handlers}
        copied={false}
        reaction="up"
        regenerating={false}
      />
    ),
  },
  {
    key: "unhelpful",
    label: "Unhelpful",
    note: "The user marked the response unhelpful.",
    Component: () => (
      <MessageActions
        {...handlers}
        copied={false}
        reaction="down"
        regenerating={false}
      />
    ),
  },
  {
    key: "regenerating",
    label: "Regenerating",
    note: "A new response is on its way, so the regenerate icon spins.",
    Component: () => (
      <MessageActions
        {...handlers}
        copied={false}
        reaction={null}
        regenerating
      />
    ),
  },
]);
