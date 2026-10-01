import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import {
  ApprovalCard,
  type ApprovalState,
} from "@assistant-ui/ui/components/assistant-ui/elements/approval-card.tsx";
import { defineSections } from "../types";

function InteractiveApprovalCard() {
  const [state, setState] = useState<ApprovalState>("request");
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

const noop = () => {};

export default defineSections([
  {
    id: "approval-card",
    title: "Approval card",
    category: "agents",
    notes: "A shell command waiting for approval; the buttons move it on.",
    render: () => <InteractiveApprovalCard />,
  },
  {
    id: "approval-card-states",
    title: "Approval card states",
    category: "agents",
    notes: "Destructive request with details, then running, done and denied.",
    render: () => (
      <div className="flex flex-col gap-3">
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
        {(["running", "done", "denied"] as const).map((state) => (
          <ApprovalCard
            key={state}
            state={state}
            command="git push --force-with-lease origin vscode/06-component-gallery"
            title="Run command"
            subtitle="The agent wants to run a shell command"
          />
        ))}
      </div>
    ),
  },
]);
