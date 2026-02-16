"use client";

import { AssistantComposer } from "@/components/docs/assistant/composer";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { useAuiState } from "@assistant-ui/react";
import { useEffect, useState, type ReactNode } from "react";

export function FloatingComposer(): ReactNode {
  const { open, setOpen } = useAssistantPanel();
  const isEmpty = useAuiState((s) => s.thread.isEmpty);
  const [hasScrolled, setHasScrolled] = useState(false);

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

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-40 hidden w-full -translate-x-1/2 px-4 transition-all duration-300 ease-out md:block ${
        isEmpty ? "max-w-lg" : "max-w-sm"
      } ${
        visible
          ? "translate-y-0 opacity-100"
          : open
            ? "pointer-events-none translate-y-4 opacity-0"
            : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div
        className={`rounded-xl shadow-lg ${
          !isEmpty
            ? "cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/30"
            : ""
        }`}
        {...(!isEmpty ? { onClick: () => setOpen(true) } : {})}
      >
        <AssistantComposer
          className="p-0"
          onSubmit={() => setOpen(true)}
        />
      </div>
    </div>
  );
}
