import { useState } from "react";
import { MessageBranches } from "@assistant-ui/ui/components/assistant-ui/elements/message-branches.tsx";
import { defineSections } from "../types";

const VARIANTS = [
  "Persist the composer draft in the runtime with the thread id as its key. When the active thread changes, read that value back into the composer.",
  "Keep drafts in a thread keyed runtime map, then hydrate the composer whenever a new thread becomes active. Delete the matching entry only after a successful send.",
  "Treat each draft as thread state instead of component state. Restoring it on thread selection keeps the composer stable without adding a second store.",
];

function MessageBranchesExample() {
  const [index, setIndex] = useState(1);
  return (
    <MessageBranches
      variants={VARIANTS}
      index={index}
      onIndexChange={setIndex}
    />
  );
}

export default defineSections([
  {
    id: "message-branches",
    title: "Message branches",
    category: "chat",
    notes: "message-branches.tsx (standalone): variant 2 of 3.",
    render: () => <MessageBranchesExample />,
  },
]);
