import {
  SpecSheet,
  type SpecRow,
} from "@assistant-ui/ui/components/assistant-ui/elements/spec-sheet.tsx";
import { defineSections } from "../types";

const ROWS: readonly SpecRow[] = [
  { label: "context", value: "1,000,000 tokens" },
  { label: "input", value: "$4.00 / M" },
  { label: "output", value: "$20.00 / M" },
  { label: "vision", value: "yes" },
  { label: "knowledge", value: "June 2026" },
  { label: "best for", value: "Long agentic runs", emphasis: true },
];

export default defineSections([
  {
    id: "spec-sheet",
    title: "Spec sheet",
    category: "content",
    notes: "All rows revealed; the last is emphasized.",
    render: () => (
      <SpecSheet
        title="Opus 5.5"
        subtitle="claude-opus-5-5"
        rows={ROWS}
        visibleCount={ROWS.length}
      />
    ),
  },
]);
