import { useState } from "react";
import {
  ConversationSearch,
  type SearchHit,
} from "@assistant-ui/ui/components/assistant-ui/elements/conversation-search.tsx";
import { defineSections } from "../types";

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

function ConversationSearchExample({ initialQuery }: { initialQuery: string }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  return (
    <ConversationSearch
      query={query}
      hits={query === "draft" ? HITS : []}
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

export default defineSections([
  {
    id: "conversation-search",
    title: "Conversation search",
    category: "chat",
    notes: 'conversation-search.tsx (standalone): hit 2 of 3 for "draft".',
    render: () => <ConversationSearchExample initialQuery="draft" />,
  },
  {
    id: "conversation-search-empty",
    title: "Conversation search (no hits)",
    category: "chat",
    render: () => <ConversationSearchExample initialQuery="xyz" />,
  },
]);
