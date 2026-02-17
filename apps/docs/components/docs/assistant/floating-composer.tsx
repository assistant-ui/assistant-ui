"use client";

import {
  AssistantComposerAction,
  models,
  useComposerSubmitHandler,
} from "@/components/docs/assistant/composer";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { MODELS } from "@/constants/model";
import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function FloatingComposer(): ReactNode {
  const { open, setOpen } = useAssistantPanel();
  const isEmpty = useAuiState((s) => s.composer.isEmpty);
  const threadIsEmpty = useAuiState((s) => s.thread.isEmpty);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setHasScrolled(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const visible = hasScrolled && !open;

  // Track isEmpty in a ref so the click-outside handler always reads the latest value
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  // Reset expanded state when floating composer becomes hidden
  useEffect(() => {
    if (!visible) {
      setExpanded(false);
    }
  }, [visible]);

  // Click outside to collapse (only when composer is empty)
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        isEmptyRef.current
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  const handleSubmit = useComposerSubmitHandler(() => setOpen(true));

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-40 hidden w-full -translate-x-1/2 px-4 transition-all duration-300 ease-out md:block ${
        expanded ? "max-w-[30rem]" : "max-w-[22rem]"
      } ${
        visible
          ? "translate-y-0 opacity-100"
          : open
            ? "pointer-events-none translate-y-4 opacity-0"
            : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div ref={containerRef}>
        <ComposerPrimitive.Root onSubmit={handleSubmit}>
          <div
            className={`relative rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ease-out ${
              expanded
                ? "border-ring/50 bg-background/90 ring-1 ring-ring/20"
                : "border-border bg-background/80 hover:ring-2 hover:ring-ring/30"
            }`}
          >
            <ComposerPrimitive.Input
              asChild
              unstable_focusOnRunStart={false}
              unstable_focusOnScrollToBottom={false}
              unstable_focusOnThreadSwitched={false}
            >
              <textarea
                placeholder="Ask a question..."
                className={`field-sizing-content w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-5 transition-[max-height,padding] duration-200 ease-out placeholder:text-muted-foreground focus:outline-none ${
                  expanded
                    ? "max-h-32 pb-10"
                    : "max-h-[38px] overflow-hidden pb-2"
                }`}
                rows={1}
                onFocus={() => {
                  if (!expanded && !threadIsEmpty) {
                    setOpen(true);
                  } else {
                    setExpanded(true);
                  }
                }}
              />
            </ComposerPrimitive.Input>
            <div
              className={`absolute inset-x-0 bottom-0 px-1.5 pb-1.5 transition-[opacity,transform] ease-out ${
                expanded
                  ? "pointer-events-auto translate-y-0 opacity-100 duration-200"
                  : "pointer-events-none translate-y-1 opacity-0 duration-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <ModelSelector
                  models={models}
                  defaultValue={MODELS[0].value}
                  variant="ghost"
                  size="sm"
                />
                <div
                  className={`transition-opacity ease-out ${
                    expanded
                      ? "opacity-100 duration-200"
                      : "opacity-0 duration-100"
                  }`}
                >
                  <AssistantComposerAction />
                </div>
              </div>
            </div>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </div>
  );
}
