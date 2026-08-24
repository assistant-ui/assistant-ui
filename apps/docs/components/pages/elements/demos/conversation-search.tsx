"use client";

import { useState } from "react";
import {
  ConversationSearch,
  type SearchHit,
} from "@/components/elements/conversation-search";

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

export function ConversationSearchDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("draft");

  return (
    <ConversationSearch
      query={query}
      hits={query === "" ? [] : HITS}
      activeIndex={activeIndex}
      onQueryChange={setQuery}
      onStep={(delta) =>
        setActiveIndex(
          (current) => (current + delta + HITS.length) % HITS.length,
        )
      }
    />
  );
}
