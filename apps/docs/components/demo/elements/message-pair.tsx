"use client";

import { useState } from "react";
import { MessagePair } from "@/components/assistant-ui/elements/message-pair";
import { useWordStream } from "@/components/demo/hooks/use-demo";

const USER_MESSAGE = "How do I persist composer drafts across threads?";
const ASSISTANT_MESSAGE =
  "Key the draft by thread id inside the runtime, hydrate the composer when a thread becomes active, and drop the entry after the message sends.";

function MessagePairStory({ variant }: { variant: "bubble" | "flat" }) {
  const [generation, setGeneration] = useState(0);

  return (
    <MessagePairGeneration
      key={generation}
      variant={variant}
      onRegenerate={() => setGeneration((current) => current + 1)}
    />
  );
}

function MessagePairGeneration({
  variant,
  onRegenerate,
}: {
  variant: "bubble" | "flat";
  onRegenerate: () => void;
}) {
  const { words, count, streaming } = useWordStream(ASSISTANT_MESSAGE, {
    interval: 82,
  });

  return (
    <MessagePair
      userMessage={USER_MESSAGE}
      words={words}
      visibleWords={count}
      streaming={streaming}
      variant={variant}
      onCopy={() => void navigator.clipboard?.writeText(ASSISTANT_MESSAGE)}
      onRegenerate={onRegenerate}
    />
  );
}

export function MessagePairDemo() {
  return <MessagePairStory variant="bubble" />;
}

export function MessagePairFlatDemo() {
  return <MessagePairStory variant="flat" />;
}
