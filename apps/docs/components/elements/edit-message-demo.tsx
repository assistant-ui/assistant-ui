"use client";

import { useState } from "react";
import { EditMessage } from "@/components/elements/edit-message";

const ORIGINAL = "Explain how the composer keeps its draft.";

export function EditMessageDemo() {
  const [value, setValue] = useState(ORIGINAL);
  const [editing, setEditing] = useState(true);

  return (
    <EditMessage
      value={value}
      discardedReplies={3}
      editing={editing}
      onValueChange={setValue}
      onStartEdit={() => setEditing(true)}
      onCancel={() => {
        setValue(ORIGINAL);
        setEditing(false);
      }}
      onSave={() => setEditing(false)}
    />
  );
}
