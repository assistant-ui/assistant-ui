import { useEffect, useRef } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { MessageStatus } from "@assistant-ui/core";
import {
  ringBell,
  sendOSCNotification,
  type OSCVariant,
} from "./notification-channels";

type IncompleteReason = Extract<
  MessageStatus,
  { type: "incomplete" }
>["reason"];

export type NotificationEvent =
  | {
      type: "task-complete";
      threadId: string;
      messageId: string;
      title: string;
    }
  | {
      type: "task-incomplete";
      threadId: string;
      messageId: string;
      title: string;
      reason: IncompleteReason;
    }
  | {
      type: "needs-input";
      threadId: string;
      messageId: string;
      title: string;
      reason: "interrupt";
    };

export type NotificationHandler<
  T extends NotificationEvent["type"] = NotificationEvent["type"],
> = {
  bell?: boolean;
  osc?: boolean | OSCVariant;
  custom?: (event: Extract<NotificationEvent, { type: T }>) => void;
};

export type NotificationConfig = {
  enabled?: boolean;
  onTaskComplete?: NotificationHandler<"task-complete"> | false;
  onTaskIncomplete?: NotificationHandler<"task-incomplete"> | false;
  onNeedsInput?: NotificationHandler<"needs-input"> | false;
};

const TITLES: Record<NotificationEvent["type"], string> = {
  "task-complete": "AI task complete",
  "task-incomplete": "AI task stopped",
  "needs-input": "AI needs input",
};

const DEFAULTS = {
  onTaskComplete: { bell: true, osc: true },
  onTaskIncomplete: { bell: true },
  onNeedsInput: { bell: true },
} satisfies {
  onTaskComplete: NotificationHandler<"task-complete">;
  onTaskIncomplete: NotificationHandler<"task-incomplete">;
  onNeedsInput: NotificationHandler<"needs-input">;
};

const dispatch = <T extends NotificationEvent["type"]>(
  handler: NotificationHandler<T> | false | undefined,
  fallback: NotificationHandler<T>,
  event: Extract<NotificationEvent, { type: T }>,
) => {
  const resolved = handler === undefined ? fallback : handler;
  if (!resolved) return;
  if (resolved.bell) ringBell();
  if (resolved.osc) {
    const variant: OSCVariant =
      typeof resolved.osc === "string" ? resolved.osc : "osc9";
    sendOSCNotification(event.title, undefined, variant);
  }
  resolved.custom?.(event);
};

type Snapshot = {
  isRunning: boolean;
  threadId: string;
  messageId: string;
  statusType: string;
  statusReason: string;
};

/**
 * Emit a terminal notification when the assistant finishes a run, stops with
 * an error, or pauses for human approval. Pass nothing for the default
 * bell-on-every-transition behavior; pass `false` for a key to suppress one.
 */
export const useNotification = (config: NotificationConfig = {}) => {
  const snapshotKey = useAuiState((s) => {
    const last = s.thread.messages.findLast((m) => m.role === "assistant");
    const statusReason =
      last?.status && "reason" in last.status ? last.status.reason : "";
    return JSON.stringify({
      isRunning: s.thread.isRunning,
      threadId: s.threadListItem.id,
      messageId: last?.id ?? "",
      statusType: last?.status?.type ?? "",
      statusReason,
    });
  });

  const seenRunningForRef = useRef<string | undefined>(undefined);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const cfg = configRef.current;
    const { isRunning, threadId, messageId, statusType, statusReason } =
      JSON.parse(snapshotKey) as Snapshot;
    const runContext = messageId ? `${threadId}:${messageId}` : undefined;
    const key =
      messageId && statusType
        ? `${threadId}:${messageId}:${statusType}:${statusReason}`
        : undefined;

    if (cfg.enabled === false) {
      seenRunningForRef.current = undefined;
      if (key) lastKeyRef.current = key;
      return;
    }
    if (isRunning && runContext) {
      seenRunningForRef.current = runContext;
    }
    if (!messageId || !statusType || !key || !runContext) return;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const seenRunning = seenRunningForRef.current === runContext;
    const base = { threadId, messageId };

    if (statusType === "complete" && seenRunning) {
      seenRunningForRef.current = undefined;
      dispatch(cfg.onTaskComplete, DEFAULTS.onTaskComplete, {
        ...base,
        type: "task-complete",
        title: TITLES["task-complete"],
      });
      return;
    }
    if (statusType === "incomplete" && statusReason && seenRunning) {
      seenRunningForRef.current = undefined;
      dispatch(cfg.onTaskIncomplete, DEFAULTS.onTaskIncomplete, {
        ...base,
        type: "task-incomplete",
        title: TITLES["task-incomplete"],
        reason: statusReason as IncompleteReason,
      });
      return;
    }
    if (statusType === "requires-action" && statusReason === "interrupt") {
      dispatch(cfg.onNeedsInput, DEFAULTS.onNeedsInput, {
        ...base,
        type: "needs-input",
        title: TITLES["needs-input"],
        reason: "interrupt",
      });
    }
  }, [snapshotKey]);
};

export type { OSCVariant } from "./notification-channels";
