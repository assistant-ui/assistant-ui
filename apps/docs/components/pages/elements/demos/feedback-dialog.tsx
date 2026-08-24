"use client";

import { useEffect, useState } from "react";
import { FeedbackDialog } from "@/components/elements/feedback-dialog";

const REASONS = [
  "Not factual",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const;

export function FeedbackDialogDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => {
      setSent(false);
      setSelected([]);
      setNote("");
    }, 2600);
    return () => clearTimeout(id);
  }, [sent]);

  return (
    <FeedbackDialog
      reasons={REASONS}
      selected={selected}
      note={note}
      sent={sent}
      onToggleReason={(reason) =>
        setSelected((current) =>
          current.includes(reason)
            ? current.filter((item) => item !== reason)
            : [...current, reason],
        )
      }
      onNoteChange={setNote}
      onSubmit={() => setSent(true)}
    />
  );
}
