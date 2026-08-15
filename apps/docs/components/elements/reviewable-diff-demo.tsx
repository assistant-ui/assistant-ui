"use client";

import { useState } from "react";
import {
  ReviewableDiff,
  type DiffHunk,
  type HunkDecision,
} from "@/components/elements/reviewable-diff";

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

export function ReviewableDiffDemo() {
  const [decisions, setDecisions] = useState<Record<string, HunkDecision>>({});

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
