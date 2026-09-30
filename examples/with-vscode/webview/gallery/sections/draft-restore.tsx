import { DraftRestore } from "@assistant-ui/ui/components/assistant-ui/elements/draft-restore.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "draft-restore",
    title: "Draft restore",
    category: "chat",
    notes: "draft-restore.tsx (standalone), with a long draft.",
    render: () => (
      <DraftRestore
        draft="Add a regression test for draft restore across thread switches, then check that a webview reload keeps it"
        savedAt="2 minutes ago"
        onRestore={() => {}}
        onDiscard={() => {}}
      />
    ),
  },
]);
