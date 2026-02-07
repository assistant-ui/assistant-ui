"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useWorkspaceTasks,
  TaskLauncherPrimitive,
  useTaskLauncher,
  type TaskState,
} from "@assistant-ui/react-agent";
import { Inbox } from "lucide-react";
import { useKeyboardNav } from "@/components/shared/useKeyboardNav";
import { SessionRow } from "./SessionRow";
import { SessionFilters, type StatusFilter } from "./SessionFilters";
import { Header, type HeaderHandle } from "@/components/layout/Header";
import { DemoPresets } from "@/components/DemoPresets";
import {
  getStoredSessions,
  type StoredSession,
  type SessionStatus,
} from "@/lib/sessionStorage";

function DemoPresetsWithLauncher() {
  const { setPrompt } = useTaskLauncher();
  return <DemoPresets onSelect={setPrompt} />;
}

// Unified session type for display
interface DisplaySessionState {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: Date;
  completedAt: Date | undefined;
  cost: number;
  agents: { id: string; events: unknown[] }[];
  pendingApprovals: { id: string; status: string }[];
}

// Helper to check if a status matches a filter category
function matchesStatusFilter(
  status: SessionStatus,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "active") return status === "starting" || status === "running";
  if (filter === "waiting") return status === "waiting_input";
  if (filter === "completed") return status === "completed";
  if (filter === "failed") return status === "failed";
  if (filter === "interrupted")
    return status === "interrupted" || status === "interrupting";
  return false;
}

interface DisplaySession {
  id: string;
  state: DisplaySessionState;
  isFromStorage: boolean;
}

// Convert stored session to display format
function storedToDisplay(stored: StoredSession): DisplaySession {
  const state: DisplaySessionState = {
    id: stored.id,
    title: stored.title,
    status: stored.status,
    createdAt: new Date(stored.createdAt),
    completedAt: stored.completedAt ? new Date(stored.completedAt) : undefined,
    cost: stored.cost,
    agents: Array.from({ length: stored.agentCount }, (_, i) => ({
      id: `agent_${i}`,
      events: [],
    })),
    pendingApprovals: [], // No pending approvals for stored sessions
  };
  return {
    id: stored.id,
    state,
    isFromStorage: true,
  };
}

export function SessionTable() {
  const router = useRouter();
  const tasks = useWorkspaceTasks();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([]);
  const headerRef = useRef<HeaderHandle>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Load stored sessions on mount
  useEffect(() => {
    setStoredSessions(getStoredSessions());
  }, []);

  // Refresh stored sessions when tasks change
  useEffect(() => {
    // Small delay to let localStorage update
    const timer = setTimeout(() => {
      setStoredSessions(getStoredSessions());
    }, 100);
    return () => clearTimeout(timer);
  }, [tasks]);

  // Merge workspace tasks with stored sessions
  const allSessions = useMemo(() => {
    const workspaceIds = new Set<string>();
    const sessions: DisplaySession[] = [];

    // First, add all workspace tasks (they take priority)
    for (const task of tasks) {
      const taskState = task.getState();
      workspaceIds.add(task.id);
      const displayState: DisplaySessionState = {
        id: task.id,
        title: taskState.title,
        status: taskState.status,
        createdAt: new Date(taskState.createdAt),
        completedAt: taskState.completedAt
          ? new Date(taskState.completedAt)
          : undefined,
        cost: taskState.cost,
        agents: taskState.agents,
        pendingApprovals: taskState.pendingApprovals,
      };
      sessions.push({
        id: task.id,
        state: displayState,
        isFromStorage: false,
      });
    }

    // Then add stored sessions that aren't in the workspace
    for (const stored of storedSessions) {
      if (!workspaceIds.has(stored.id)) {
        sessions.push(storedToDisplay(stored));
      }
    }

    return sessions;
  }, [tasks, storedSessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return allSessions.filter((session) => {
      // Status filter
      if (!matchesStatusFilter(session.state.status, statusFilter)) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return session.state.title.toLowerCase().includes(query);
      }

      return true;
    });
  }, [allSessions, statusFilter, searchQuery]);

  // Sort by createdAt descending (newest first)
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort(
      (a, b) =>
        new Date(b.state.createdAt).getTime() -
        new Date(a.state.createdAt).getTime(),
    );
  }, [filteredSessions]);

  // Keyboard navigation
  const { selectedIndex, setSelectedIndex } = useKeyboardNav({
    items: sortedSessions,
    onActivate: (session) => {
      router.push(`/sessions/${session.id}`);
    },
    enabled: true,
  });

  // Scroll selected item into view
  useEffect(() => {
    const row = rowRefs.current.get(selectedIndex);
    if (row) {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard shortcuts: / for search, n for new session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
          setSearchQuery("");
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        headerRef.current?.focusSearch();
      }
      if (e.key === "n") {
        e.preventDefault();
        headerRef.current?.openNewSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header
        ref={headerRef}
        title="Sessions"
        onSearch={setSearchQuery}
        searchPlaceholder="Search sessions... (press /)"
      />

      {/* Filters Bar */}
      <div className="flex items-center justify-between border-border border-b bg-muted/30 px-6 py-3">
        <SessionFilters
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />
        <p className="text-muted-foreground text-sm">
          {sortedSessions.length} session
          {sortedSessions.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-4 border-border border-b bg-muted/50 px-6 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
        <div className="w-4 shrink-0" /> {/* Status icon space */}
        <div className="min-w-0 flex-1">Session</div>
        <div className="w-20 shrink-0 text-right">Cost</div>
        <div className="w-20 shrink-0 text-right">Duration</div>
        <div className="w-24 shrink-0 text-right">Created</div>
        <div className="w-24 shrink-0 text-center">Status</div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-auto">
        {sortedSessions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-2 font-semibold text-lg">No sessions found</h3>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              {searchQuery
                ? `No sessions match "${searchQuery}". Try a different search term.`
                : statusFilter !== "all"
                  ? `No ${statusFilter} sessions. Try changing the filter.`
                  : "Create your first agent session to get started."}
            </p>

            {!searchQuery && statusFilter === "all" && (
              <div className="w-full max-w-2xl">
                <TaskLauncherPrimitive.Root
                  onSubmit={(taskId: string) => {
                    router.push(`/sessions/${taskId}`);
                  }}
                >
                  <DemoPresetsWithLauncher />
                </TaskLauncherPrimitive.Root>
              </div>
            )}
          </div>
        ) : (
          sortedSessions.map((session, index) => (
            <SessionRow
              key={session.id}
              ref={(el) => {
                if (el) rowRefs.current.set(index, el);
                else rowRefs.current.delete(index);
              }}
              task={session.state as TaskState}
              isSelected={index === selectedIndex}
              onClick={() => {
                setSelectedIndex(index);
                router.push(`/sessions/${session.id}`);
              }}
            />
          ))
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
            <kbd className="rounded bg-muted px-1.5 py-0.5">Enter</kbd> open
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> search
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5">n</kbd> new session
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          {selectedIndex + 1} of {sortedSessions.length}
        </div>
      </div>
    </div>
  );
}
