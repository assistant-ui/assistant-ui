"use client";

import { useEffect, useState } from "react";
import {
  MessageActions,
  type Reaction,
} from "@/components/assistant-ui/elements/message-actions";

export function MessageActionsDemo() {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!regenerating) return undefined;
    const id = setTimeout(() => setRegenerating(false), 900);
    return () => clearTimeout(id);
  }, [regenerating]);

  return (
    <MessageActions
      copied={copied}
      reaction={reaction}
      regenerating={regenerating}
      onCopy={() => setCopied(true)}
      onReactionChange={setReaction}
      onRegenerate={() => setRegenerating(true)}
      onMore={() => {}}
    />
  );
}
