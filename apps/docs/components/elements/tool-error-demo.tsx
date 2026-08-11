"use client";

import { useEffect, useState } from "react";
import { ToolError } from "@/components/elements/tool-error";

export function ToolErrorDemo() {
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    if (!retrying) return;
    const id = setTimeout(() => {
      setRetrying(false);
      setAttempt((current) => (current >= 3 ? 1 : current + 1));
    }, 1600);
    return () => clearTimeout(id);
  }, [retrying]);

  return (
    <ToolError
      name="fetch"
      target="https://api.example.com/v1/issues"
      message="ETIMEDOUT after 30000ms"
      attempt={attempt}
      maxAttempts={3}
      retrying={retrying}
      onRetry={() => setRetrying(true)}
      onSkip={() => setAttempt(1)}
    />
  );
}
