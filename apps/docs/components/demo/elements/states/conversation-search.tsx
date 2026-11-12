"use client";

import {
  ConversationSearch,
  type SearchHit,
} from "@/components/assistant-ui/elements/conversation-search";
import { defineStates } from "./types";

const noop = () => {};

const HITS: readonly SearchHit[] = [
  {
    id: "1",
    before: "The composer reads the ",
    match: "draft",
    after: " from a per-thread slot.",
    position: 12,
  },
  {
    id: "2",
    before: "Clearing the ",
    match: "draft",
    after: " on switch fixes it at the source.",
    position: 46,
  },
  {
    id: "3",
    before: "Add a regression test for ",
    match: "draft",
    after: " restore.",
    position: 78,
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty query",
    note: "Nothing typed yet, so there are no hits or markers.",
    Component: () => (
      <ConversationSearch
        query=""
        hits={[]}
        activeIndex={0}
        onQueryChange={noop}
        onStep={noop}
      />
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "The query matches nothing in the conversation.",
    Component: () => (
      <ConversationSearch
        query="checkpoint"
        hits={[]}
        activeIndex={0}
        onQueryChange={noop}
        onStep={noop}
      />
    ),
  },
  {
    key: "last-match",
    label: "Last match",
    note: "Stepped to the final hit, near the bottom of the conversation.",
    Component: () => (
      <ConversationSearch
        query="draft"
        hits={HITS}
        activeIndex={2}
        onQueryChange={noop}
        onStep={noop}
      />
    ),
  },
  {
    key: "no-stepper",
    label: "No stepper",
    note: "Without a step handler the previous and next buttons are hidden.",
    Component: () => (
      <ConversationSearch
        query="draft"
        hits={HITS}
        activeIndex={0}
        onQueryChange={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Many hits",
    note: "Many hits and a long excerpt around the active match.",
    Component: () => {
      const hits: SearchHit[] = Array.from({ length: 14 }, (_, i) => ({
        id: String(i + 1),
        before:
          i === 4
            ? "When the remote thread list hydrates after a reload, the composer briefly points at the old slot, so the "
            : "The ",
        match: "thread id",
        after:
          i === 4
            ? " it uses to read the draft is stale for one render and the previous text is copied forward."
            : " changes.",
        position: 4 + i * 7,
      }));
      return (
        <ConversationSearch
          query="thread id"
          hits={hits}
          activeIndex={4}
          onQueryChange={noop}
          onStep={noop}
        />
      );
    },
  },
]);
