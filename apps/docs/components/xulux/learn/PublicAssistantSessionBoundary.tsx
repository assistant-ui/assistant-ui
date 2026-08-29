"use client";

import { ensureAnonymousSession } from "@/lib/anonymous-session-client";
import { useEffect, useState } from "react";

type SessionState = "loading" | "ready" | "error";

export function PublicAssistantSessionBoundary({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<SessionState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    ensureAnonymousSession().then(
      () => {
        if (active) setState("ready");
      },
      () => {
        if (active) setState("error");
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state === "ready") return children;

  return (
    <div
      className="bg-background text-muted-foreground flex h-full items-center justify-center p-6 text-sm"
      role={state === "error" ? "alert" : "status"}
    >
      {state === "error" ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p>Unable to start the preview session.</p>
          <button
            className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5"
            type="button"
            onClick={() => {
              setState("loading");
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        "Starting preview…"
      )}
    </div>
  );
}
