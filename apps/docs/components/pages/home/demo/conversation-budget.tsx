"use client";

import { useAuiState } from "@assistant-ui/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { refreshDemoUsage, useDemoUsage } from "@/lib/demo-usage-client";
import { useSession } from "@/lib/session";

function resetsIn(resetAt: number): string {
  const hours = Math.max(1, Math.ceil((resetAt - Date.now()) / 3_600_000));
  return hours === 1 ? "in an hour" : `in ${hours} hours`;
}

export function ConversationBudget({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const state = useDemoUsage();
  const session = useSession();
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
  const pathname = usePathname();
  const wasEmpty = useRef(isEmpty);

  // A send is the only thing that spends a conversation, and it is the moment
  // the thread stops being empty.
  useEffect(() => {
    if (wasEmpty.current && !isEmpty) refreshDemoUsage();
    wasEmpty.current = isEmpty;
  }, [isEmpty]);

  // A conversation already under way was counted when it started, so only a
  // new one meets the gate.
  if (state.status !== "ready" || state.usage.remaining > 0 || !isEmpty) {
    return children;
  }

  const { limit, resetAt } = state.usage;
  const canSignIn = session.status === "anonymous";

  return (
    <div className="border-foreground/10 bg-muted/30 rounded-thread flex flex-col gap-3 border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px] leading-relaxed">
        {!canSignIn
          ? `That is all ${limit} conversations for today. The next one opens ${resetsIn(resetAt)}.`
          : `That is all ${limit} conversations for today. Sign in for ten a day.`}
      </p>
      {canSignIn ? (
        <a
          href={`/api/auth/login?redirect=${encodeURIComponent(pathname)}`}
          className="bg-primary text-primary-foreground rounded-control grid h-8 shrink-0 place-items-center px-3 text-[13px] font-medium transition-opacity hover:opacity-90"
        >
          Sign in
        </a>
      ) : null}
    </div>
  );
}
