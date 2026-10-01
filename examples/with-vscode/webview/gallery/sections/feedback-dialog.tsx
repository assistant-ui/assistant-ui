import { useState } from "react";
import { FeedbackDialog } from "@assistant-ui/ui/components/assistant-ui/elements/feedback-dialog.tsx";
import { defineSections } from "../types";

const REASONS = [
  "Not factual",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const;

function FeedbackDialogExample({
  initialSelected = [],
  initialNote = "",
  sent = false,
}: {
  initialSelected?: string[];
  initialNote?: string;
  sent?: boolean;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [note, setNote] = useState(initialNote);
  return (
    <FeedbackDialog
      reasons={REASONS}
      selected={selected}
      note={note}
      sent={sent}
      onToggleReason={(reason) =>
        setSelected((current) =>
          current.includes(reason)
            ? current.filter((r) => r !== reason)
            : [...current, reason],
        )
      }
      onNoteChange={setNote}
      onSubmit={() => {}}
    />
  );
}

export default defineSections([
  {
    id: "feedback-dialog",
    title: "Feedback dialog",
    category: "chat",
    notes:
      "feedback-dialog.tsx (standalone) renders inline: two reasons picked and a note.",
    render: () => (
      <FeedbackDialogExample
        initialSelected={["Not factual", "Too long"]}
        initialNote="It cited a flag that does not exist."
      />
    ),
  },
  {
    id: "feedback-dialog-sent",
    title: "Feedback dialog (sent)",
    category: "chat",
    render: () => <FeedbackDialogExample sent />,
  },
]);
