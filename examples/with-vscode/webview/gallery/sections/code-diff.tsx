import {
  CodeDiff,
  type DiffLine,
} from "@assistant-ui/ui/components/assistant-ui/elements/code-diff.tsx";
import { defineSections } from "../types";

const LINES: DiffLine[] = [
  { kind: "context", text: "export function Composer() {" },
  { kind: "context", text: "  const threadId = useThreadId();" },
  { kind: "context", text: "  const composer = useComposer();" },
  { kind: "removed", text: '  const [draft, setDraft] = useState("");' },
  { kind: "added", text: "  const draft = useDraft(threadId);" },
  {
    kind: "added",
    text: "  useEffect(() => hydrate(draft, { restoreAttachments: true, restoreSelection: true }), [threadId]);",
  },
  { kind: "context", text: "  return (" },
  { kind: "context", text: "    <form onSubmit={composer.send}>" },
];

export default defineSections([
  {
    id: "code-diff",
    title: "Code diff",
    category: "content",
    notes:
      "Unified diff with a line longer than the card, which should scroll.",
    render: () => (
      <CodeDiff
        filename="composer.tsx"
        additions={2}
        deletions={1}
        lines={LINES}
        cycle={0}
      />
    ),
  },
]);
