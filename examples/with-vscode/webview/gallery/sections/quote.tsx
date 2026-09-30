import { useEffect, useRef } from "react";
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  ComposerQuotePreview,
  QuoteBlock,
  SelectionToolbar,
} from "@assistant-ui/ui/components/assistant-ui/elements/quote.aui.tsx";
import { cn } from "@/lib/utils";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

const QUOTED = "The runtime system follows a layered architecture";

const MESSAGES: ThreadMessageLike[] = [
  {
    id: "a0",
    role: "assistant",
    content: `${QUOTED}: primitives read state from scopes, and runtimes feed those scopes from any backend.`,
  },
  {
    id: "u1",
    role: "user",
    content: "Can you explain how the layers connect?",
    metadata: { custom: { quote: { text: QUOTED, messageId: "a0" } } },
  },
];

function Message() {
  const role = useAuiState((s) => s.message.role);
  return (
    <MessagePrimitive.Root
      className={cn(
        "text-sm",
        role === "user" && "bg-muted self-end rounded-2xl px-4 py-2.5",
      )}
    >
      <MessagePrimitive.Quote>
        {(quote) => <QuoteBlock {...quote} />}
      </MessagePrimitive.Quote>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

/** Sets the composer's quote on mount, as the toolbar's Quote button does. */
function SetComposerQuote() {
  const aui = useAui();
  useEffect(() => {
    aui.composer().setQuote({ text: QUOTED, messageId: "a0" });
  }, [aui]);
  return null;
}

/** Selects the first words of the assistant message on mount. */
function SelectAssistantText() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const message = ref.current
        ?.closest("[data-gallery-body]")
        ?.querySelector("[data-message-id]");
      const text = message
        ? document.createTreeWalker(message, NodeFilter.SHOW_TEXT).nextNode()
        : null;
      if (!text) return;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, QUOTED.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 100);
    return () => clearTimeout(id);
  }, []);
  return <span ref={ref} hidden />;
}

function QuoteExample({ selection = false }: { selection?: boolean }) {
  return (
    <SeededRuntime messages={MESSAGES}>
      <ThreadPrimitive.Root
        className={cn("flex flex-col gap-4", selection && "pt-12")}
      >
        <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
        <ComposerPrimitive.Root className="rounded-xl border">
          <ComposerQuotePreview />
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
            rows={1}
          />
        </ComposerPrimitive.Root>
        <SelectionToolbar />
      </ThreadPrimitive.Root>
      {selection ? <SelectAssistantText /> : <SetComposerQuote />}
    </SeededRuntime>
  );
}

export default defineSections([
  {
    id: "quote",
    title: "Quote",
    category: "chat",
    notes:
      "quote.aui.tsx: the quote block on a user message and the composer quote preview (set on mount).",
    render: () => <QuoteExample />,
  },
  {
    id: "quote-selection-toolbar",
    title: "Quote (selection toolbar)",
    category: "chat",
    notes:
      "The first words of the assistant message are selected on mount, so the floating Quote toolbar shows above them. Scrolling hides it.",
    render: () => <QuoteExample selection />,
  },
]);
