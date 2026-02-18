"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TaskPrimitive,
  useTaskState,
  useTask,
  useAgentWorkspace,
  type AgentEvent,
} from "@assistant-ui/react-agent";
import {
  Activity,
  Clock,
  ChevronLeft,
  Users,
  LayoutGrid,
  List,
  Columns,
  MessageCircle,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationStream } from "./ConversationStream";
import { ChatInput } from "./ChatInput";
import { ThinkingDisplay } from "@/components/ThinkingDisplay";
import { CostDashboard } from "@/components/CostDashboard";
import { EnhancedApproval } from "@/components/EnhancedApproval";
import { AgentHierarchyView } from "@/components/AgentHierarchyView";
import { Badge } from "@/components/ui/badge";
import {
  updateSessionFromEvents,
  getStoredSession,
  type StoredSession,
} from "@/lib/sessionStorage";

type ViewMode = "stream" | "split" | "tree";

function SessionDetailContent() {
  const router = useRouter();
  const task = useTask();
  const status = useTaskState((s) => s.status);
  const title = useTaskState((s) => s.title);
  const cost = useTaskState((s) => s.cost);
  const createdAt = useTaskState((s) => s.createdAt);
  const completedAt = useTaskState((s) => s.completedAt);
  const agents = useTaskState((s) => s.agents);
  const pendingApprovalsRaw = useTaskState((s) => s.pendingApprovals);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    undefined,
  );
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);

  // Filter events by selected agent or show all
  const allEvents: AgentEvent[] = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)?.events || []
    : agents
        .flatMap((agent) => agent.events)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

  const pendingApprovals = pendingApprovalsRaw.filter(
    (a) => a.status === "pending",
  );

  // Persist session to localStorage whenever events change
  useEffect(() => {
    if (task && allEvents.length > 0) {
      const taskState = task.getState();
      // Convert AgentEvent[] to SDKEvent[] format for storage
      const sdkEvents = allEvents.map((e) => ({
        type: e.type,
        taskId: taskState.id,
        agentId: e.agentId,
        data: e.content,
        timestamp: e.timestamp,
      }));
      updateSessionFromEvents(taskState.id, sdkEvents as any, title);
    }
  }, [task, allEvents, title]);

  // Detect waiting for input state
  useEffect(() => {
    const lastEvent = allEvents[allEvents.length - 1];
    const content = lastEvent?.content as
      | { isWaitingForInput?: boolean }
      | undefined;
    setIsWaitingForInput(
      content?.isWaitingForInput === true && status === "running",
    );
  }, [allEvents, status]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!task) return;
      const taskState = task.getState();

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          taskId: taskState.id,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    },
    [task],
  );

  const formatDuration = () => {
    const start = new Date(createdAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const statusColors: Record<string, string> = {
    draft: "text-muted-foreground",
    starting: "text-blue-400",
    running: "text-blue-500",
    waiting_input: "text-amber-500",
    completed: "text-success",
    failed: "text-destructive",
    interrupting: "text-orange-500",
    interrupted: "text-orange-400",
    discarded: "text-muted-foreground",
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          router.push("/sessions");
          break;
        case "1":
          setViewMode("stream");
          break;
        case "2":
          setViewMode("split");
          break;
        case "3":
          setViewMode("tree");
          break;
        case "c":
          if (["starting", "running", "waiting_input"].includes(status) && task) {
            e.preventDefault();
            task.cancel();
          }
          break;
      }
    },
    [router, status, task],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/sessions")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Back to sessions (Esc)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Activity
                className={cn("h-5 w-5 shrink-0", statusColors[status])}
              />
              <h1 className="truncate font-semibold text-lg">{title}</h1>
              <TaskPrimitive.Status showIcon className="capitalize" />
            </div>
            <div className="mt-1 flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration()}
              </span>
              <span className="font-mono">${cost.toFixed(4)}</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {agents.length} agent{agents.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("stream")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                viewMode === "stream"
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Stream View (1)"
            >
              <List className="h-4 w-4" />
              Stream
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                viewMode === "split"
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Split View (2)"
            >
              <Columns className="h-4 w-4" />
              Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                viewMode === "tree"
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Tree View (3)"
            >
              <LayoutGrid className="h-4 w-4" />
              Tree
            </button>
          </div>

          {["starting", "running", "waiting_input"].includes(status) && (
            <TaskPrimitive.Cancel className="rounded-lg bg-destructive/10 px-4 py-2 font-medium text-destructive text-sm transition-colors hover:bg-destructive/20">
              Cancel
            </TaskPrimitive.Cancel>
          )}
        </div>
      </div>

      {/* Pending Approvals - Always on top */}
      {pendingApprovals.length > 0 && (
        <div className="border-border border-b bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="warning">
              {pendingApprovals.length} pending approval
              {pendingApprovals.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-muted-foreground text-xs">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5">y</kbd> to
              approve, <kbd className="rounded bg-muted px-1.5 py-0.5">s</kbd>{" "}
              for session, or{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">d</kbd> to deny
            </span>
          </div>
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <EnhancedApproval key={approval.id} approvalId={approval.id} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Panel - Agent Tree (in split/tree mode) */}
        {(viewMode === "split" || viewMode === "tree") && agents.length > 0 && (
          <div
            className={cn(
              "flex flex-col overflow-hidden border-border border-r",
              viewMode === "tree" ? "flex-1" : "w-80",
            )}
          >
            <div className="flex-1 overflow-auto p-4">
              <AgentHierarchyView
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />

              {/* Show All Agents button when an agent is selected */}
              {selectedAgentId && (
                <button
                  type="button"
                  onClick={() => setSelectedAgentId(undefined)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Users className="h-3.5 w-3.5" />
                  Show All Agents
                </button>
              )}

              {/* Thinking Display */}
              <ThinkingDisplay events={allEvents} className="mt-4" />
            </div>

            {/* Cost Dashboard in tree view */}
            {viewMode === "tree" && (
              <div className="border-border border-t p-4">
                <CostDashboard />
              </div>
            )}
          </div>
        )}

        {/* Right Panel - Conversation Stream */}
        {(viewMode === "stream" || viewMode === "split") && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-4">
              <ConversationStream events={allEvents} className="h-full" />
            </div>

            {/* Chat Input - Show when task is active */}
            {["running", "waiting_input"].includes(status) && (
              <div className="border-border border-t bg-card p-4">
                {isWaitingForInput && (
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground text-sm">
                    <MessageCircle className="h-4 w-4" />
                    <span>Agent is waiting for your response...</span>
                  </div>
                )}
                <ChatInput
                  onSend={handleSendMessage}
                  placeholder={
                    isWaitingForInput
                      ? "Type your response..."
                      : "Send a follow-up message..."
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Hints */}
      <div className="flex items-center justify-between border-border border-t bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">1</kbd>{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">2</kbd>{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5">3</kbd> view modes
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">y</kbd> approve
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">d</kbd> deny
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd> back
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {allEvents.length} events
        </div>
      </div>
    </div>
  );
}

// Stored session view for sessions loaded from localStorage
function StoredSessionDetail({ session }: { session: StoredSession }) {
  const router = useRouter();

  // Keyboard shortcuts for archived sessions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        router.push("/sessions");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Convert stored events to AgentEvent format for display
  const events: AgentEvent[] = session.events.map((e, i) => ({
    id: `evt_${i}`,
    type: e.type as AgentEvent["type"],
    timestamp: new Date(e.timestamp),
    content: e.data,
    agentId: e.agentId || "main",
  }));

  const formatDuration = () => {
    const start = new Date(session.createdAt).getTime();
    const end = session.completedAt
      ? new Date(session.completedAt).getTime()
      : new Date(session.createdAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const statusColors: Record<string, string> = {
    draft: "text-muted-foreground",
    starting: "text-blue-400",
    running: "text-blue-500",
    waiting_input: "text-amber-500",
    completed: "text-success",
    failed: "text-destructive",
    interrupting: "text-orange-500",
    interrupted: "text-orange-400",
    discarded: "text-muted-foreground",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/sessions")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Back to sessions (Esc)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Activity
                className={cn("h-5 w-5 shrink-0", statusColors[session.status])}
              />
              <h1 className="truncate font-semibold text-lg">
                {session.title}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Archive className="h-3 w-3" />
                Archived
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration()}
              </span>
              <span className="font-mono">${session.cost.toFixed(4)}</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.agentCount} agent{session.agentCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-2 border-border border-b bg-muted/30 px-6 py-3 text-muted-foreground text-sm">
        <Archive className="h-4 w-4" />
        <span>
          This is an archived session loaded from local storage. Some features
          are not available.
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <ConversationStream events={events} className="h-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-border border-t bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd> back
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {events.length} events
        </div>
      </div>
    </div>
  );
}

export interface SessionDetailProps {
  sessionId: string;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const workspace = useAgentWorkspace();
  const [storedSession, setStoredSession] = useState<StoredSession | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check if task exists in workspace
  const task = workspace.getTask(sessionId);

  // Load stored session if not in workspace
  useEffect(() => {
    if (!task) {
      const stored = getStoredSession(sessionId);
      setStoredSession(stored);
    }
    setIsLoading(false);
  }, [sessionId, task]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  // Live task - use TaskPrimitive
  if (task) {
    return (
      <TaskPrimitive.Root taskId={sessionId}>
        <SessionDetailContent />
      </TaskPrimitive.Root>
    );
  }

  // Stored session - use StoredSessionDetail
  if (storedSession) {
    return <StoredSessionDetail session={storedSession} />;
  }

  // Session not found
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-muted-foreground">Session not found</div>
      <a href="/sessions" className="text-primary hover:underline">
        Back to sessions
      </a>
    </div>
  );
}
