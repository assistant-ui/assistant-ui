import type { ApprovalDecision, PendingApproval } from '@/components/agent-playground/runtime/assistantTypes';

export function ApprovalCard({
  approvals,
  onDecision,
}: {
  approvals: PendingApproval[];
  onDecision: (approvalId: string, decision: ApprovalDecision) => void;
}) {
  if (approvals.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 space-y-2 overflow-y-auto">
      {approvals.map((approval, index) => {
        const isActive = index === 0;
        return (
        <div key={approval.id} className="rounded-lg border border-amber-600/50 bg-background/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium text-amber-100">{isActive ? 'Permission required' : 'Queued approval'}</div>
              <div className="mt-1 text-amber-200/75">{approval.toolName}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onDecision(approval.id, 'approve')}
                disabled={!isActive}
              >
                Allow once
              </button>
              <button
                className="rounded-md border border-amber-500/60 px-3 py-1.5 text-xs font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onDecision(approval.id, 'always_allow_category')}
                disabled={!isActive}
              >
                Always allow
              </button>
              <button
                className="rounded-md border border-red-500/60 px-3 py-1.5 text-xs font-medium text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onDecision(approval.id, 'decline')}
                disabled={!isActive}
              >
                Deny
              </button>
            </div>
          </div>
          <pre className="scrollbar-thin mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs text-foreground/90">
            {JSON.stringify(approval.args ?? {}, null, 2)}
          </pre>
        </div>
        );
      })}
    </div>
  );
}
