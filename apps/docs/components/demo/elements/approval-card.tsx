"use client";

import { useEffect, useState } from "react";
import {
  ApprovalCard,
  type ApprovalState,
} from "@/components/assistant-ui/elements/approval-card";

export function ApprovalCardDemo() {
  const [state, setState] = useState<ApprovalState>("request");

  useEffect(() => {
    if (state === "request") return;
    const delay = state === "running" ? 1800 : state === "done" ? 2400 : 1600;
    const id = setTimeout(() => {
      setState(state === "running" ? "done" : "request");
    }, delay);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <ApprovalCard
      state={state}
      command="pnpm vitest run --changed"
      title="Run command"
      subtitle="The agent wants to run a shell command"
      onAllowOnce={() => setState("running")}
      onAlwaysAllow={() => setState("running")}
      onDeny={() => setState("denied")}
    />
  );
}
