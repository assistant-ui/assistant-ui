import { useState } from "react";
import {
  ReviewableDiff,
  type DiffHunk,
  type HunkDecision,
} from "@assistant-ui/ui/components/assistant-ui/elements/reviewable-diff.tsx";
import { defineSections } from "../types";

const HUNKS: readonly DiffHunk[] = [
  {
    id: "h1",
    range: "@@ -12,6 +12,7",
    decision: "pending",
    lines: [
      { kind: "context", text: "  const composer = useComposer();" },
      { kind: "removed", text: '  const [draft, setDraft] = useState("");' },
      { kind: "added", text: "  const draft = useDraft(threadId);" },
    ],
  },
  {
    id: "h2",
    range: "@@ -31,4 +32,5",
    decision: "pending",
    lines: [
      { kind: "context", text: "  useEffect(() => {" },
      { kind: "added", text: "    if (!threadId) return;" },
      { kind: "context", text: "    hydrate(draft);" },
    ],
  },
];

function Review({ initial = {} }: { initial?: Record<string, HunkDecision> }) {
  const [decisions, setDecisions] =
    useState<Record<string, HunkDecision>>(initial);
  const decide = (id: string, decision: HunkDecision) =>
    setDecisions((current) => ({ ...current, [id]: decision }));
  return (
    <ReviewableDiff
      filename="composer.tsx"
      hunks={HUNKS.map((hunk) => ({
        ...hunk,
        decision: decisions[hunk.id] ?? "pending",
      }))}
      onKeep={(id) => decide(id, "kept")}
      onDiscard={(id) => decide(id, "discarded")}
      onApply={() => setDecisions({})}
    />
  );
}

export default defineSections([
  {
    id: "reviewable-diff",
    title: "Reviewable diff",
    category: "content",
    notes: "Two pending hunks with keep and discard buttons.",
    render: () => <Review />,
  },
  {
    id: "reviewable-diff-decided",
    title: "Reviewable diff (decided)",
    category: "content",
    notes: "One hunk kept, one discarded.",
    render: () => <Review initial={{ h1: "kept", h2: "discarded" }} />,
  },
]);
