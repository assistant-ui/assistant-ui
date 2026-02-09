"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalQueuePrimitive,
  useApprovalQueue,
  useAgentWorkspace,
  TaskPrimitive,
} from "@assistant-ui/react-agent";
import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalCard } from "./ApprovalCard";
import { Header } from "@/components/layout/Header";
import { useExtendedKeyboardNav } from "@/components/shared/useKeyboardNav";
import { Badge } from "@/components/ui/badge";

function ApprovalInboxContent() {
  const router = useRouter();
  const workspace = useAgentWorkspace();
  const approvals = useApprovalQueue({ status: "pending" });
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  // Keyboard navigation with approval actions
  const { selectedIndex, setSelectedIndex } = useExtendedKeyboardNav({
    items: pendingApprovals,
    enabled: true,
    loop: true,
    onApprove: async (item) => {
      setResolving((prev) => new Set(prev).add(item.id));
      try {
        const task = workspace.getTask(item.taskId);
        const approvalRuntime = task?.getApproval(item.id);
        if (approvalRuntime) {
          await approvalRuntime.approve("once");
        }
      } finally {
        setResolving((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    onDeny: async (item) => {
      setResolving((prev) => new Set(prev).add(item.id));
      try {
        const task = workspace.getTask(item.taskId);
        const approvalRuntime = task?.getApproval(item.id);
        if (approvalRuntime) {
          await approvalRuntime.deny();
        }
      } finally {
        setResolving((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    onApproveSession: async (item) => {
      setResolving((prev) => new Set(prev).add(item.id));
      try {
        const task = workspace.getTask(item.taskId);
        const approvalRuntime = task?.getApproval(item.id);
        if (approvalRuntime) {
          await approvalRuntime.approve("session");
        }
      } finally {
        setResolving((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    onApproveAll: async () => {
      try {
        for (const approval of pendingApprovals) {
          setResolving((prev) => new Set(prev).add(approval.id));
          const task = workspace.getTask(approval.taskId);
          const approvalRuntime = task?.getApproval(approval.id);
          if (approvalRuntime) {
            await approvalRuntime.approve("once");
          }
        }
      } finally {
        setResolving(new Set());
      }
    },
    onDenyAll: async () => {
      try {
        for (const approval of pendingApprovals) {
          setResolving((prev) => new Set(prev).add(approval.id));
          const task = workspace.getTask(approval.taskId);
          const approvalRuntime = task?.getApproval(approval.id);
          if (approvalRuntime) {
            await approvalRuntime.deny();
          }
        }
      } finally {
        setResolving(new Set());
      }
    },
    onActivate: (item) => {
      // Navigate to the session for this approval
      router.push(`/sessions/${item.taskId}`);
    },
    onEscape: () => {
      router.push("/sessions");
    },
  });

  // Scroll selected item into view
  useEffect(() => {
    const card = cardRefs.current.get(selectedIndex);
    if (card) {
      card.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Clamp index when approvals change
  useEffect(() => {
    if (
      selectedIndex >= pendingApprovals.length &&
      pendingApprovals.length > 0
    ) {
      setSelectedIndex(pendingApprovals.length - 1);
    }
  }, [pendingApprovals.length, selectedIndex, setSelectedIndex]);

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Approval Inbox"
        showSearch={false}
        showNewSession={false}
      />

      {/* Stats Bar */}
      <div className="flex items-center justify-between border-border border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {pendingApprovals.length} pending
            </span>
          </div>
          {pendingApprovals.length > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-sm">
                {selectedIndex + 1} of {pendingApprovals.length}
              </span>
            </>
          )}
        </div>

        {pendingApprovals.length > 1 && (
          <div className="flex items-center gap-2">
            <ApprovalQueuePrimitive.ApproveAll className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 font-medium text-sm text-success transition-colors hover:bg-success/20">
              Approve All ({pendingApprovals.length})
            </ApprovalQueuePrimitive.ApproveAll>
            <ApprovalQueuePrimitive.DenyAll className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 font-medium text-destructive text-sm transition-colors hover:bg-destructive/20">
              Deny All
            </ApprovalQueuePrimitive.DenyAll>
          </div>
        )}
      </div>

      {/* Approval List */}
      <div className="flex-1 overflow-auto">
        {pendingApprovals.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="mb-4 rounded-full bg-success/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="mb-2 font-semibold text-lg">All caught up!</h3>
            <p className="max-w-md text-center text-muted-foreground">
              No pending approvals. New approval requests will appear here when
              agents need your permission.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {pendingApprovals.map((approval, index) => (
              <TaskPrimitive.Root key={approval.id} taskId={approval.taskId}>
                <ApprovalCard
                  ref={(el) => {
                    if (el) cardRefs.current.set(index, el);
                    else cardRefs.current.delete(index);
                  }}
                  approvalId={approval.id}
                  isFocused={index === selectedIndex}
                  onViewSession={() =>
                    router.push(`/sessions/${approval.taskId}`)
                  }
                  className={cn(
                    resolving.has(approval.id) &&
                      "pointer-events-none opacity-50",
                  )}
                />
              </TaskPrimitive.Root>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Hints */}
      <div className="flex items-center justify-between border-border border-t bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">j</kbd>{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">k</kbd> navigate
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">a</kbd> approve
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">d</kbd> deny
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">s</kbd> session
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">Shift+A</kbd> all
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">Enter</kbd> view
          </span>
        </div>
        {pendingApprovals.length > 0 && (
          <Badge variant="warning">
            {pendingApprovals.length} awaiting response
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ApprovalInbox() {
  return (
    <ApprovalQueuePrimitive.Root filter={{ status: "pending" }}>
      <ApprovalInboxContent />
    </ApprovalQueuePrimitive.Root>
  );
}
