"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import {
  useDisplayMode,
  useWorkbenchStore,
  useWorkbenchTheme,
  useConversationMode,
} from "@/lib/workbench/store";
import { MorphContainer } from "./component-renderer";
import { ConversationView } from "./conversation-view";

interface MockMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Can you help me with this?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Of course! I've prepared something for you. Take a look at the interactive view above.",
  },
];

const MOCK_MESSAGES_AFTER: MockMessage[] = [
  {
    id: "3",
    role: "user",
    content: "That looks great, thanks!",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "You're welcome! Let me know if you need anything else or want to make changes.",
  },
];

function MessageBubble({
  role,
  content,
  isDark,
}: {
  role: "user" | "assistant";
  content: string;
  isDark: boolean;
}) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? isDark
              ? "bg-blue-600 text-white"
              : "bg-blue-500 text-white"
            : isDark
              ? "bg-neutral-800 text-neutral-100"
              : "bg-neutral-100 text-neutral-900",
        )}
      >
        {content}
      </div>
    </div>
  );
}

function MessageList({
  messages,
  isDark,
}: {
  messages: MockMessage[];
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

interface ChatThreadProps {
  children: ReactNode;
  className?: string;
}

export function ChatThread({ children, className }: ChatThreadProps) {
  const displayMode = useDisplayMode();
  const theme = useWorkbenchTheme();
  const conversationMode = useConversationMode();
  const maxHeight = useWorkbenchStore((s) => s.maxHeight);
  const intrinsicHeight = useWorkbenchStore((s) => s.intrinsicHeight);
  const isDark = theme === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);
  const widgetHeight =
    intrinsicHeight !== null
      ? Math.min(Math.max(intrinsicHeight, 0), maxHeight)
      : maxHeight;

  useEffect(() => {
    if (scrollRef.current && displayMode === "pip") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMode]);

  useEffect(() => {
    if (displayMode === "fullscreen") {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // Notify parent window to prevent scrolling
      if (window.parent !== window) {
        // Use document.referrer to get parent origin, fallback to same origin
        const targetOrigin = document.referrer
          ? new URL(document.referrer).origin
          : window.location.origin;

        window.parent.postMessage(
          { type: "workbench:fullscreen", value: true },
          targetOrigin,
        );
      }

      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";

        // Notify parent window to restore scrolling
        if (window.parent !== window) {
          const targetOrigin = document.referrer
            ? new URL(document.referrer).origin
            : window.location.origin;

          window.parent.postMessage(
            { type: "workbench:fullscreen", value: false },
            targetOrigin,
          );
        }
      };
    }
  }, [displayMode]);

  if (displayMode === "fullscreen") {
    return (
      <FullscreenLayout className={className} isDark={isDark}>
        {children}
      </FullscreenLayout>
    );
  }

  if (displayMode === "pip") {
    return (
      <PipLayout
        className={className}
        isDark={isDark}
        scrollRef={scrollRef}
        widgetHeight={widgetHeight}
      >
        {children}
      </PipLayout>
    );
  }

  if (conversationMode) {
    return (
      <ConversationView className={className} widgetHeight={widgetHeight}>
        {children}
      </ConversationView>
    );
  }

  return (
    <IsolatedLayout
      className={className}
      isDark={isDark}
      widgetHeight={widgetHeight}
    >
      {children}
    </IsolatedLayout>
  );
}

interface LayoutProps {
  children: ReactNode;
  className?: string;
  isDark: boolean;
}

interface InlineLayoutProps extends LayoutProps {
  widgetHeight: number;
}

function IsolatedLayout({
  children,
  className,
  isDark,
  widgetHeight,
}: InlineLayoutProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center justify-center overflow-hidden px-4 transition-colors",
        isDark ? "bg-neutral-900" : "bg-white",
        className,
      )}
    >
      <MorphContainer
        className={cn(
          "w-full max-w-[770px] overflow-hidden rounded-2xl border shadow-sm",
          isDark ? "border-neutral-700" : "border-neutral-200",
        )}
        style={{ height: widgetHeight, maxHeight: widgetHeight }}
      >
        <div className="h-full overflow-auto">{children}</div>
      </MorphContainer>
    </div>
  );
}

interface PipLayoutProps extends LayoutProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  widgetHeight: number;
}

function PipLayout({
  children,
  className,
  isDark,
  scrollRef,
  widgetHeight,
}: PipLayoutProps) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden transition-colors",
        isDark ? "bg-neutral-900" : "bg-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
        <MorphContainer
          className={cn(
            "pointer-events-auto w-full max-w-[770px] overflow-hidden rounded-2xl border shadow-lg transition-colors",
            isDark
              ? "border-neutral-700 bg-neutral-900"
              : "border-neutral-200 bg-white",
          )}
          style={{ height: widgetHeight, maxHeight: widgetHeight }}
        >
          <div className="h-full overflow-auto">{children}</div>
        </MorphContainer>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-subtle relative z-0 h-full overflow-y-auto"
        style={{ paddingTop: widgetHeight + 24 }}
      >
        <div className="mx-auto flex max-w-[770px] flex-col gap-3 px-4 pb-24">
          <MessageList
            messages={[...MOCK_MESSAGES, ...MOCK_MESSAGES_AFTER]}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}

function FullscreenLayout({ children, className, isDark }: LayoutProps) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden transition-colors",
        isDark ? "bg-neutral-900" : "bg-white",
        className,
      )}
      style={{ overscrollBehavior: "contain" }}
    >
      <MorphContainer
        className="h-full overflow-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        {children}
      </MorphContainer>
    </div>
  );
}
