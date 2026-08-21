"use client";

import {
  CodeDiff,
  type DiffLine,
} from "@/components/assistant-ui/elements/code-diff";

const LINES: DiffLine[] = [
  { kind: "context", text: "export function Composer() {" },
  { kind: "context", text: "  const threadId = useThreadId();" },
  { kind: "context", text: "  const composer = useComposer();" },
  { kind: "removed", text: '  const [draft, setDraft] = useState("");' },
  { kind: "added", text: "  const draft = useDraft(threadId);" },
  {
    kind: "added",
    text: "  useEffect(() => hydrate(draft), [threadId]);",
  },
  { kind: "context", text: "  return (" },
  { kind: "context", text: "    <form onSubmit={composer.send}>" },
  { kind: "context", text: "      {/* … */}" },
];

export function CodeDiffDemo() {
  return (
    <CodeDiff
      filename="composer.tsx"
      additions={2}
      deletions={1}
      lines={LINES}
      cycle={0}
    />
  );
}
