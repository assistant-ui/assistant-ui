"use client";

import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import {
  ComposerPrimitive,
  createThreadRowsSelector,
  groupPartByType,
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
  useRef,
  useState,
} from "react";

const ESTIMATED_ROW_HEIGHT = 80;
const AT_BOTTOM_THRESHOLD = 4;

const selectRows = createThreadRowsSelector({
  groupBy: groupPartByType({ reasoning: ["group-reasoning"] }),
});

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const UserMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="user"
    className="bg-muted ml-auto w-fit max-w-[80%] rounded-xl px-4 py-2"
  >
    <MessagePrimitive.Parts />
  </MessagePrimitive.Root>
);

const renderRow: ComponentProps<typeof ThreadPrimitive.Row>["children"] = (
  info,
) => {
  switch (info.type) {
    case "message":
      return <UserMessage />;
    case "turn-end": {
      const { turn } = info;
      if (turn?.completedAt === undefined) return null;
      return (
        <p className="text-muted-foreground text-xs">
          Worked for {formatDuration(turn.completedAt - turn.startedAt)}
        </p>
      );
    }
    case "part": {
      const { part } = info;
      switch (part.type) {
        case "group-reasoning":
          return (
            <details className="text-muted-foreground text-sm">
              <summary>Reasoning</summary>
              {info.children}
            </details>
          );
        case "reasoning":
          return <p className="whitespace-pre-line">{part.text}</p>;
        case "text":
          return (
            <div className="text-foreground leading-relaxed">
              <MarkdownText />
            </div>
          );
        case "tool-call":
          return (
            part.toolUI ?? (
              <p className="text-muted-foreground font-mono text-xs">
                {part.toolName} {part.argsText}
              </p>
            )
          );
        default:
          return null;
      }
    }
  }
};

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
  const rows = useAuiState(selectRows);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => rows[index]!.key,
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
    if (rows.length > 0)
      virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el && stickyRef.current) el.scrollTop = el.scrollHeight;
    });
  }, [rows.length, virtualizer]);

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
    if (didInitialJumpRef.current || rows.length === 0) return;
    didInitialJumpRef.current = true;
    jumpToBottom();
  }, [rows.length, jumpToBottom]);

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
                className="py-2"
              >
                <ThreadPrimitive.Row row={rows[item.index]!}>
                  {renderRow}
                </ThreadPrimitive.Row>
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
