"use client";

import { useAuiState } from "@assistant-ui/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { analytics } from "@/lib/analytics";
import { trackDemoSignInClick } from "@/lib/analytics-identity";
import { refreshDemoUsage, useDemoUsage } from "@/lib/demo-usage-client";
import { useSession } from "@/lib/session";

// The gate unmounts with the composer whenever the visitor switches threads, so
// the day it was reported for is held outside the component.
let reportedResetAt = 0;

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
  const refreshedFor = useRef(0);

  // A send is the only thing that spends a conversation, and it is the moment
  // the thread stops being empty.
  useEffect(() => {
    if (wasEmpty.current && !isEmpty) refreshDemoUsage();
    wasEmpty.current = isEmpty;
  }, [isEmpty]);

  const spent = state.status === "ready" && state.usage.remaining === 0;
  const resetAt = state.status === "ready" ? state.usage.resetAt : 0;

  // A tab left open across the reset would otherwise keep showing a spent day.
  // A budget that arrived already expired is re-read once per reset rather than
  // on every answer, so a device clock running ahead cannot spin the endpoint.
  useEffect(() => {
    if (!spent) return;
    const delay = resetAt - Date.now();
    if (delay > 0) {
      const timer = setTimeout(
        refreshDemoUsage,
        Math.min(delay + 1_000, 2 ** 30),
      );
      return () => clearTimeout(timer);
    }
    if (refreshedFor.current === resetAt) return;
    refreshedFor.current = resetAt;
    refreshDemoUsage();
    return;
  }, [spent, resetAt]);

  const gated = spent && isEmpty;
  const signedIn = state.status === "ready" && state.usage.signedIn;
  const limit = state.status === "ready" ? state.usage.limit : 0;

  useEffect(() => {
    if (!gated || reportedResetAt === resetAt) return;
    reportedResetAt = resetAt;
    analytics.demo.budgetExhausted(signedIn, limit);
  }, [gated, signedIn, limit, resetAt]);

  // A conversation already under way was counted when it started, so only a new
  // one meets the gate.
  if (!gated || state.status !== "ready") return children;

  // The gate does not wait for the session: leaving the composer live would let
  // a send through to a 429. Only the action it can offer waits.
  const canSignIn = session.status === "anonymous";

  return (
    <div className="border-foreground/10 bg-muted/30 rounded-thread flex flex-col gap-3 border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px] leading-relaxed">
        {`That is all ${limit} conversations for today.`}
        {canSignIn ? " Sign in for ten a day." : null}
        {session.status === "signed-in"
          ? ` The next one opens ${resetsIn(resetAt)}.`
          : null}
      </p>
      {canSignIn ? (
        <a
          href={`/api/auth/login?redirect=${encodeURIComponent(pathname)}`}
          onClick={() => trackDemoSignInClick("budget")}
          className="bg-primary text-primary-foreground rounded-control grid h-8 shrink-0 place-items-center px-3 text-[13px] font-medium transition-opacity hover:opacity-90"
        >
          Sign in
        </a>
      ) : null}
    </div>
  );
}
