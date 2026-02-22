"use client";

/**
 * localStorage persistence for agent sessions.
 * Stores session metadata and events for offline access and persistence.
 */

import type { SDKEvent } from "@assistant-ui/react-agent";

/**
 * Session statuses:
 * - draft: Before launch
 * - starting: Starting up
 * - running: Actively running
 * - waiting_input: Waiting for approval or user input
 * - completed: Completed successfully
 * - failed: Encountered an error
 * - interrupting: Shutting down
 * - interrupted: Stopped but can resume
 * - discarded: Draft discarded
 */
export type SessionStatus =
  | "draft"
  | "starting"
  | "running"
  | "waiting_input"
  | "completed"
  | "failed"
  | "interrupting"
  | "interrupted"
  | "discarded";

export interface StoredSession {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
  completedAt: string | undefined;
  cost: number;
  events: SDKEvent[];
  agentCount: number;
}

const STORAGE_KEY = "agent-dashboard-sessions";
const MAX_SESSIONS = 50; // Limit stored sessions to prevent localStorage overflow

export function getStoredSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as StoredSession[];
  } catch (error) {
    console.error("Failed to parse stored sessions:", error);
    return [];
  }
}

export function getStoredSession(sessionId: string): StoredSession | null {
  const sessions = getStoredSessions();
  return sessions.find((s) => s.id === sessionId) ?? null;
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getStoredSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }

    // Keep only the most recent sessions
    const trimmedSessions = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSessions));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

export function updateSessionFromEvents(
  sessionId: string,
  events: SDKEvent[],
  title?: string,
): void {
  if (typeof window === "undefined") return;

  const existing = getStoredSession(sessionId);

  // Determine status from events
  let status: SessionStatus = "running";
  let completedAt: string | undefined;
  let cost = 0;
  const agentIds = new Set<string>();
  let hasPendingApproval = false;
  let isWaitingForInput = false;

  for (const event of events) {
    if (event.type === "task_completed") {
      status = "completed";
      completedAt = new Date(event.timestamp).toISOString();
    } else if (event.type === "task_failed") {
      status = "failed";
      completedAt = new Date(event.timestamp).toISOString();
    } else if (event.type === "cost_update" && event.data) {
      const data = event.data as { totalCost?: number };
      if (data.totalCost !== undefined) {
        cost = data.totalCost;
      }
    } else if (event.type === "agent_spawned" && event.agentId) {
      agentIds.add(event.agentId);
    } else if (event.type === "tool_use_requested") {
      hasPendingApproval = true;
    } else if (
      event.type === "tool_use_approved" ||
      event.type === "tool_use_denied"
    ) {
      hasPendingApproval = false;
    } else if (event.type === "message" && event.data) {
      const data = event.data as { isWaitingForInput?: boolean };
      isWaitingForInput = !!data.isWaitingForInput;
    }
  }

  // Determine final status
  if (status === "running" && (hasPendingApproval || isWaitingForInput)) {
    status = "waiting_input";
  }

  // Extract title from first message or task_started event
  let sessionTitle = title || existing?.title || "Untitled Session";
  if (!title) {
    const taskStarted = events.find((e) => e.type === "task_started");
    if (taskStarted?.data) {
      const data = taskStarted.data as { prompt?: string };
      if (data.prompt) {
        sessionTitle = data.prompt.slice(0, 100);
      }
    }
  }

  const session: StoredSession = {
    id: sessionId,
    title: sessionTitle,
    status,
    createdAt: existing?.createdAt || new Date().toISOString(),
    completedAt,
    cost,
    events,
    agentCount: agentIds.size || 1,
  };

  saveSession(session);
}

export function deleteSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear sessions:", error);
  }
}
