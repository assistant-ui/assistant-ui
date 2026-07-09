"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, SendHorizontalIcon } from "lucide-react";
import {
  type ComponentProps,
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ESTIMATED_TURN_HEIGHT = 200;
const AT_BOTTOM_THRESHOLD = 4;

type MessageComponents = ComponentProps<
  typeof ThreadPrimitive.Unstable_MessageById
>["components"];

type MessageRow = {
  id: string;
  role: "user" | "assistant" | "system";
};

type Turn = { id: string; messageIds: string[] };

const useThreadMessageRows = (): readonly MessageRow[] => {
  const prevRowsRef = useRef<readonly MessageRow[]>([]);

  return useAuiState((s) => {
    const messages = s.thread.messages;
    const prev = prevRowsRef.current;
    if (
      prev.length === messages.length &&
      prev.every((row, index) => {
        const message = messages[index]!;
        return row.id === message.id && row.role === message.role;
      })
    ) {
      return prev;
    }

    const next = messages.map(({ id, role }) => ({ id, role }));
    prevRowsRef.current = next;
    return next;
  });
};

const buildTurns = (messages: readonly MessageRow[]): Turn[] => {
  if (messages.length === 0) return [];
  const turns: Turn[] = [];
  for (const { id, role } of messages) {
    const last = turns.at(-1);
    if (role === "user" || !last) turns.push({ id, messageIds: [id] });
    else last.messageIds.push(id);
  }
  return turns;
};

const UserMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="user"
    className="bg-muted ml-auto w-fit max-w-[80%] rounded-xl px-4 py-2"
  >
    <MessagePrimitive.Parts />
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="assistant"
    className="text-foreground leading-relaxed"
  >
    <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
  </MessagePrimitive.Root>
);

const MESSAGE_COMPONENTS: MessageComponents = { UserMessage, AssistantMessage };

const Composer: FC = () => (
  <ComposerPrimitive.Root className="border-border bg-background focus-within:ring-ring flex items-end rounded-xl border shadow-sm focus-within:ring-1">
    <ComposerPrimitive.Input
      placeholder="Send a message to watch the thread follow the stream"
      className="placeholder:text-muted-foreground max-h-40 flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none"
      rows={1}
      autoFocus
    />
    <ComposerPrimitive.Send
      aria-label="Send"
      className="text-muted-foreground hover:text-foreground m-2 rounded-lg p-2 transition-colors disabled:opacity-40"
    >
      <SendHorizontalIcon className="size-4" />
    </ComposerPrimitive.Send>
  </ComposerPrimitive.Root>
);

export const VirtualizedThread: FC = () => {
  const messages = useThreadMessageRows();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const turns = useMemo(() => buildTurns(messages), [messages]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const virtualizer = useVirtualizer({
    count: turns.length,
    estimateSize: () => ESTIMATED_TURN_HEIGHT,
    getItemKey: (index) => turns[index]!.id,
    getScrollElement: () => scrollerRef.current,
    initialRect: { height: 800, width: 800 },
    overscan: 4,
    scrollToFn: (offset, _options, instance) => {
      const el = instance.scrollElement;
      if (!el) return;
      if (stickyRef.current) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (
          maxScroll - el.scrollTop <= AT_BOTTOM_THRESHOLD &&
          offset < maxScroll
        )
          return;
      }
      el.scrollTo(0, offset);
    },
  });

  const jumpToBottom = useCallback(() => {
    stickyRef.current = true;
    if (turns.length > 0)
      virtualizer.scrollToIndex(turns.length - 1, { align: "end" });
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el && stickyRef.current) el.scrollTop = el.scrollHeight;
    });
  }, [turns.length, virtualizer]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    let lastScrollHeight = el.scrollHeight;
    let lastClientHeight = el.clientHeight;
    const onScroll = () => {
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_THRESHOLD;
      if (atBottom) {
        stickyRef.current = true;
      } else if (
        el.scrollTop < lastScrollTop &&
        el.scrollHeight === lastScrollHeight &&
        Math.abs(el.clientHeight - lastClientHeight) <= 1
      ) {
        stickyRef.current = false;
      }
      lastScrollTop = el.scrollTop;
      lastScrollHeight = el.scrollHeight;
      lastClientHeight = el.clientHeight;
      setIsAtBottom(atBottom);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) stickyRef.current = false;
    };
    const disarm = () => {
      stickyRef.current = false;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", disarm, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", disarm);
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const observer = new ResizeObserver(() => {
      if (stickyRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const prevIsRunningRef = useRef(false);
  useLayoutEffect(() => {
    if (isRunning && !prevIsRunningRef.current) jumpToBottom();
    prevIsRunningRef.current = isRunning;
  }, [isRunning, jumpToBottom]);

  const didInitialJumpRef = useRef(false);
  useLayoutEffect(() => {
    if (didInitialJumpRef.current || turns.length === 0) return;
    didInitialJumpRef.current = true;
    jumpToBottom();
  }, [turns.length, jumpToBottom]);

  const items = virtualizer.getVirtualItems();
  const paddingTop = items[0]?.start ?? 0;
  const paddingBottom = Math.max(
    0,
    virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0),
  );

  return (
    <ThreadPrimitive.Root className="bg-background flex h-full flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 pt-4">
          <div style={{ paddingTop, paddingBottom }}>
            {items.map((item) => (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="flex flex-col gap-4 py-3"
              >
                {turns[item.index]!.messageIds.map((messageId) => (
                  <ThreadPrimitive.Unstable_MessageById
                    key={messageId}
                    messageId={messageId}
                    components={MESSAGE_COMPONENTS}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4 pb-4">
        {!isAtBottom && (
          <button
            type="button"
            onClick={jumpToBottom}
            aria-label="Scroll to bottom"
            className="border-border bg-background hover:bg-muted absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border p-2 shadow-sm transition-colors"
          >
            <ArrowDownIcon className="size-4" />
          </button>
        )}
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
};
