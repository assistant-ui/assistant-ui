"use client";

import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { XIcon } from "lucide-react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { AskAiWindowFrame } from "./window-frame";
import { analytics } from "@/lib/analytics";

const AssistantSession = lazy(() => import("./session"));

class SessionBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SessionPlaceholder({ failed = false }: { failed?: boolean }) {
  const { open, setOpen } = useAssistantPanel();
  if (!open) return null;
  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-foreground/10 flex h-11 shrink-0 items-center justify-between border-b px-3.5">
        <span className="text-muted-foreground text-xs font-medium">
          assistant-ui · Ask AI
        </span>
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => {
            analytics.assistant.panelToggled({ open: false, source: "header" });
            setOpen(false);
          }}
          className="text-muted-foreground hover:text-foreground rounded-control flex size-7 items-center justify-center transition-colors"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div
        role="status"
        className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 px-4 text-sm"
      >
        {failed ? "Chat could not load." : "Loading chat…"}
        {failed ? (
          <button
            type="button"
            className="text-foreground underline underline-offset-4"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AskAiWindow() {
  const { open, toggle, setOpen } = useAssistantPanel();
  const [activated, setActivated] = useState(open);
  if (open && !activated) setActivated(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "i")
        return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      analytics.assistant.panelToggled({ open: !open, source: "shortcut" });
      toggle();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [toggle, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      analytics.assistant.panelToggled({ open: false, source: "shortcut" });
      setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  if (!activated) return null;

  return (
    <AskAiWindowFrame open={open}>
      <SessionBoundary fallback={<SessionPlaceholder failed />}>
        <Suspense fallback={<SessionPlaceholder />}>
          <AssistantSession open={open} />
        </Suspense>
      </SessionBoundary>
    </AskAiWindowFrame>
  );
}
