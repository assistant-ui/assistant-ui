"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "./MyRuntimeProvider";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

function ResumeToast({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg transition-opacity",
      )}
    >
      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      <span>Resuming previous session...</span>
    </div>
  );
}

export default function Home() {
  const [isResuming, setIsResuming] = useState(false);

  const handleResuming = useCallback((resuming: boolean) => {
    setIsResuming(resuming);
  }, []);

  return (
    <MyRuntimeProvider onResuming={handleResuming}>
      <main className="relative h-dvh">
        <ResumeToast show={isResuming} />
        <Thread />
      </main>
    </MyRuntimeProvider>
  );
}
