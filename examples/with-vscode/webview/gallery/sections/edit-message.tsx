import { useState } from "react";
import { EditMessage } from "@assistant-ui/ui/components/assistant-ui/elements/edit-message.tsx";
import { defineSections } from "../types";

const ORIGINAL = "Explain how the composer keeps its draft.";

function EditMessageExample({ initialEditing }: { initialEditing: boolean }) {
  const [value, setValue] = useState(ORIGINAL);
  const [saved, setSaved] = useState(ORIGINAL);
  const [editing, setEditing] = useState(initialEditing);
  return (
    <EditMessage
      value={value}
      discardedReplies={3}
      editing={editing}
      onValueChange={setValue}
      onStartEdit={() => setEditing(true)}
      onCancel={() => {
        setValue(saved);
        setEditing(false);
      }}
      onSave={() => {
        setSaved(value);
        setEditing(false);
      }}
    />
  );
}

export default defineSections([
  {
    id: "edit-message",
    title: "Edit message (editing)",
    category: "chat",
    notes:
      "edit-message.tsx (standalone) in edit mode, warning that 3 replies are discarded.",
    render: () => <EditMessageExample initialEditing />,
  },
  {
    id: "edit-message-idle",
    title: "Edit message (idle)",
    category: "chat",
    render: () => <EditMessageExample initialEditing={false} />,
  },
]);
