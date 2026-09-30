import { useState } from "react";
import {
  MessageActions,
  type Reaction,
} from "@assistant-ui/ui/components/assistant-ui/elements/message-actions.tsx";
import { defineSections } from "../types";

function MessageActionsExample({
  copied = false,
  initialReaction = null,
  regenerating = false,
}: {
  copied?: boolean;
  initialReaction?: Reaction;
  regenerating?: boolean;
}) {
  const [reaction, setReaction] = useState<Reaction>(initialReaction);
  return (
    <MessageActions
      copied={copied}
      reaction={reaction}
      regenerating={regenerating}
      onCopy={() => {}}
      onReactionChange={setReaction}
      onRegenerate={() => {}}
      onMore={() => {}}
    />
  );
}

export default defineSections([
  {
    id: "message-actions",
    title: "Message actions",
    category: "chat",
    notes:
      "message-actions.tsx (standalone): idle; then copied with a thumbs up; then regenerating with a thumbs down.",
    render: () => (
      <div className="flex flex-col gap-3">
        <MessageActionsExample />
        <MessageActionsExample copied initialReaction="up" />
        <MessageActionsExample regenerating initialReaction="down" />
      </div>
    ),
  },
]);
