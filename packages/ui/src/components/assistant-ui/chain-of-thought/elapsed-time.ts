"use client";

import { useEffect, useRef, useState } from "react";

export function useElapsedSeconds(isActive: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number | undefined>(
    undefined,
  );
  const startRef = useRef<number | null>(null);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive) {
      if (!wasActiveRef.current || startRef.current == null) {
        startRef.current = Date.now();
      }

      const updateElapsed = () => {
        if (startRef.current == null) return;
        const elapsedMs = Date.now() - startRef.current;
        setElapsedSeconds(Math.max(1, Math.round(elapsedMs / 1000)));
      };

      updateElapsed();
      const intervalId = window.setInterval(updateElapsed, 1000);
      wasActiveRef.current = isActive;
      return () => window.clearInterval(intervalId);
    }

    if (wasActiveRef.current && startRef.current != null) {
      const elapsedMs = Date.now() - startRef.current;
      setElapsedSeconds(Math.max(1, Math.round(elapsedMs / 1000)));
      startRef.current = null;
    }

    wasActiveRef.current = isActive;
    return undefined;
  }, [isActive]);

  return elapsedSeconds;
}
