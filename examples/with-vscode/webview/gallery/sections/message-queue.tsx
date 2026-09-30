import { useState } from "react";
import {
  MessageQueue,
  type QueuedMessage,
} from "@assistant-ui/ui/components/assistant-ui/elements/message-queue.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const INITIAL: QueuedMessage[] = [
  { id: "a", text: "Also add a changeset" },
  { id: "b", text: "Then run the full suite" },
  {
    id: "c",
    text: "And open the PR when it's green, with a description that lists every probe the change touches",
  },
];

function InteractiveQueue() {
  const [queued, setQueued] = useState(INITIAL);
  return (
    <MessageQueue
      running="Fix the converter and add a guard"
      queued={queued}
      onCancel={(id) =>
        setQueued((current) => current.filter((message) => message.id !== id))
      }
    />
  );
}

export default defineSections([
  {
    id: "message-queue",
    title: "Message queue",
    category: "agents",
    notes:
      "A running message with three queued behind it; each can be cancelled.",
    render: () => (
      <States>
        <State label="queued">
          <InteractiveQueue />
        </State>
        <State label="nothing queued">
          <MessageQueue
            running="Fix the converter and add a guard"
            queued={[]}
          />
        </State>
      </States>
    ),
  },
]);
