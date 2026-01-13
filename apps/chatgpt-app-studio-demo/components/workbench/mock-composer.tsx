"use client";

import { useRef, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import {
  useDeviceType,
  useWorkbenchStore,
  useIsTransitioning,
} from "@/lib/workbench/store";

type ComposerVariant = "bottom" | "overlay";

interface MockComposerProps {
  variant?: ComposerVariant;
}

export function MockComposer({ variant = "bottom" }: MockComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const deviceType = useDeviceType();
  const theme = useWorkbenchStore((s) => s.theme);
  const isTransitioning = useIsTransitioning();
  const isMobile = deviceType === "mobile";
  const isDark = theme === "dark";

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${scrollHeight}px`;

    const lineHeight =
      parseInt(getComputedStyle(textarea).lineHeight, 10) || 24;
    setIsMultiline(scrollHeight > lineHeight * 1.5);
  }, []);

  const isOverlay = variant === "overlay";

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex justify-center",
        isMobile ? "px-3 pb-3" : "px-4 pb-4",
        isOverlay && "pt-8",
        isOverlay &&
          (isDark
            ? "bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent"
            : "bg-gradient-to-t from-white via-white/90 to-transparent"),
      )}
      style={{
        viewTransitionName: isTransitioning ? "workbench-composer" : undefined,
      }}
    >
      <div
        className={cn(
          "relative flex w-full items-center border shadow-sm transition-colors",
          isDark
            ? "border-neutral-800 bg-neutral-900"
            : "border-neutral-200 bg-white",
          isMobile
            ? "min-h-12 rounded-2xl pr-1.5 pl-4"
            : "min-h-14 max-w-2xl rounded-full pr-2 pl-6",
          isMultiline && (isMobile ? "rounded-2xl py-1.5" : "rounded-3xl py-2"),
        )}
      >
        <textarea
          ref={textareaRef}
          placeholder="Send a message..."
          rows={1}
          onInput={handleInput}
          className={cn(
            "w-full resize-none self-center bg-transparent leading-6 outline-none transition-colors",
            isDark
              ? "text-neutral-100 placeholder:text-neutral-500"
              : "text-neutral-900 placeholder:text-neutral-400",
            isMobile
              ? "max-h-[200px] pr-10 text-sm"
              : "max-h-[300px] pr-12 text-base",
          )}
        />
        <button
          type="button"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-colors",
            isDark ? "bg-white" : "bg-neutral-950",
            isMobile ? "size-8" : "size-10",
            isMultiline &&
              (isMobile
                ? "absolute right-1.5 bottom-1.5"
                : "absolute right-2 bottom-2"),
          )}
        >
          <ArrowUp
            className={cn(
              isDark ? "text-neutral-900" : "text-white",
              isMobile ? "size-4" : "size-5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
