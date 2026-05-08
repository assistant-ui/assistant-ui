import type {
  ApprovalDecision,
  PendingApproval,
} from "@/components/agent-playground/runtime/assistantTypes";

export function ApprovalCard({
  approvals,
  onDecision,
}: {
  approvals: PendingApproval[];
  onDecision: (approvalId: string, decision: ApprovalDecision) => void;
}) {
  if (approvals.length === 0) return null;

  return (
    <div className="scrollbar-thin absolute right-0 bottom-full left-0 z-20 mb-2 max-h-64 space-y-2 overflow-y-auto">
      {approvals.map((approval, index) => {
        const isActive = index === 0;
        return (
          <div
            key={approval.id}
            className="rounded-lg border border-amber-600/50 bg-background/95 p-3 text-sm shadow-xl backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium text-amber-100">
                  {isActive ? "Permission required" : "Queued approval"}
                </div>
                <div className="mt-1 text-amber-200/75">
                  {approval.toolName}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-amber-400 px-3 py-1.5 font-medium text-black text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onDecision(approval.id, "approve")}
                  disabled={!isActive}
                >
                  Allow once
                </button>
                <button
                  type="button"
                  className="rounded-md border border-amber-500/60 px-3 py-1.5 font-medium text-amber-100 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() =>
                    onDecision(approval.id, "always_allow_category")
                  }
                  disabled={!isActive}
                >
                  Always allow
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-500/60 px-3 py-1.5 font-medium text-red-200 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onDecision(approval.id, "decline")}
                  disabled={!isActive}
                >
                  Deny
                </button>
              </div>
            </div>
            <pre className="scrollbar-thin mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-foreground/90 text-xs">
              {JSON.stringify(approval.args ?? {}, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
