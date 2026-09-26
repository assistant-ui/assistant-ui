"use client";

import { useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
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

export function ApprovalCardDestructiveDemo() {
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
      variant="destructive"
      icon={<Trash2Icon className="size-4" />}
      title="Delete 12 archived conversations"
      subtitle="This action cannot be undone"
      description="The selected conversations and their generated files will be permanently removed."
      details={[
        { label: "Conversations", value: "12 archived" },
        { label: "Generated files", value: "38 files" },
      ]}
      allowOnceLabel="Delete conversations"
      denyLabel="Keep conversations"
      onAllowOnce={() => setState("running")}
      onDeny={() => setState("denied")}
    />
  );
}
