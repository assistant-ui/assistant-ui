"use client";

import { useState } from "react";
import {
  MessageQueue,
  type QueuedMessage,
} from "@/components/assistant-ui/elements/message-queue";

const INITIAL: QueuedMessage[] = [
  { id: "a", text: "Also add a changeset" },
  { id: "b", text: "Then run the full suite" },
  { id: "c", text: "And open the PR when it's green" },
];

export function MessageQueueDemo() {
  const [queued, setQueued] = useState(INITIAL);

  return (
    <MessageQueue
      running="Fix the converter and add a guard"
      queued={queued}
      onCancel={(id) =>
        setQueued((current) => {
          const next = current.filter((message) => message.id !== id);
          return next.length > 0 ? next : INITIAL;
        })
      }
    />
  );
}
