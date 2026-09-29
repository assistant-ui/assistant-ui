"use client";

import { useEffect, useState } from "react";
import {
  MessageActions,
  type Reaction,
} from "@/components/assistant-ui/elements/message-actions";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export function MessageActionsDemo() {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1400,
  });
  const [reaction, setReaction] = useState<Reaction>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!regenerating) return undefined;
    const id = setTimeout(() => setRegenerating(false), 900);
    return () => clearTimeout(id);
  }, [regenerating]);

  return (
    <MessageActions
      copied={isCopied}
      reaction={reaction}
      regenerating={regenerating}
      onCopy={() => copyToClipboard("...")}
      onReactionChange={setReaction}
      onRegenerate={() => setRegenerating(true)}
      onMore={() => {}}
    />
  );
}
