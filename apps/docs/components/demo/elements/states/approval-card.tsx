"use client";

import { Trash2Icon } from "lucide-react";
import { ApprovalCard } from "@/components/assistant-ui/elements/approval-card";
import { defineStates } from "./types";

const noop = () => {};

const command = {
  command: "pnpm vitest run --changed",
  title: "Run command",
  subtitle: "The agent wants to run a shell command",
  onAllowOnce: noop,
  onAlwaysAllow: noop,
  onDeny: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "requires-action",
    label: "Pending",
    note: "Waiting on the user before the command runs.",
    Component: () => <ApprovalCard {...command} state="request" />,
  },
  {
    key: "running",
    label: "Running",
    note: "Approved and still executing.",
    Component: () => <ApprovalCard {...command} state="running" />,
  },
  {
    key: "success",
    label: "Done",
    note: "The approved command finished.",
    Component: () => <ApprovalCard {...command} state="done" />,
  },
  {
    key: "denied",
    label: "Denied",
    note: "The user refused, so nothing ran.",
    Component: () => <ApprovalCard {...command} state="denied" />,
  },
  {
    key: "destructive",
    label: "Destructive",
    note: "An irreversible action asks with its consequences listed.",
    Component: () => (
      <ApprovalCard
        state="request"
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
        onAllowOnce={noop}
        onDeny={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long command",
    note: "A command longer than the card wraps or scrolls without breaking the layout.",
    Component: () => (
      <ApprovalCard
        {...command}
        state="request"
        command="docker run --rm -v $(pwd):/workspace -w /workspace -e NODE_OPTIONS=--max-old-space-size=8192 node:22 pnpm turbo build --filter=@assistant-ui/react... --concurrency=4"
      />
    ),
  },
]);
