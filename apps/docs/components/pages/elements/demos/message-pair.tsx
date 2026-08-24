"use client";

import { MessagePair } from "@/components/elements/message-pair";
import { useWordStream } from "@/components/demo/use-demo";

const USER_MESSAGE = "How do I persist composer drafts across threads?";
const ASSISTANT_MESSAGE =
  "Key the draft by thread id inside the runtime, hydrate the composer when a thread becomes active, and drop the entry after the message sends.";

function MessagePairStory({ variant }: { variant: "bubble" | "flat" }) {
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
    />
  );
}

export function MessagePairDemo() {
  return <MessagePairStory variant="bubble" />;
}

export function MessagePairFlatDemo() {
  return <MessagePairStory variant="flat" />;
}
