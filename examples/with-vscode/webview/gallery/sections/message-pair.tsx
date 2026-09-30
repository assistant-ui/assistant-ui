import { MessagePair } from "@assistant-ui/ui/components/assistant-ui/elements/message-pair.tsx";
import { defineSections } from "../types";

const USER_MESSAGE = "How do I persist composer drafts across threads?";
const WORDS =
  "Key the draft by thread id inside the runtime, hydrate the composer when a thread becomes active, and drop the entry after the message sends.".split(
    " ",
  );

export default defineSections([
  {
    id: "message-pair",
    title: "Message pair (bubble)",
    category: "chat",
    notes: "message-pair.tsx (standalone), fully streamed.",
    render: () => (
      <MessagePair
        userMessage={USER_MESSAGE}
        words={WORDS}
        visibleWords={WORDS.length}
        streaming={false}
        variant="bubble"
        onCopy={() => {}}
        onRegenerate={() => {}}
      />
    ),
  },
  {
    id: "message-pair-flat",
    title: "Message pair (flat, streaming)",
    category: "chat",
    notes: "Flat variant halfway through the stream.",
    render: () => (
      <MessagePair
        userMessage={USER_MESSAGE}
        words={WORDS}
        visibleWords={12}
        streaming
        variant="flat"
      />
    ),
  },
]);
