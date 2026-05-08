import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SimpleImageAttachmentAdapter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import type { AppendMessage } from "@assistant-ui/react";
import {
  type AugmentClient,
  augmentClient,
} from "@/components/agent-playground/augment/client";
import {
  approveToolCallCommand,
  respondToToolSuspensionCommand,
  respondToQuestionCommand,
  sendMessageCommand,
  setThinkingLevelCommand,
  skipWorkspaceEnvCommand,
  submitWorkspaceEnvCommand,
  switchModeCommand,
  type ThinkingLevel,
} from "@/components/agent-playground/augment/commands";
import type {
  AgentSession,
  ServerEvent,
  SessionCommand,
  SubmitWorkspaceEnvInput,
} from "@/components/agent-playground/augment/types";
import type { ApprovalDecision } from "./assistantTypes";
import { useAugmentEventSource } from "@/components/agent-playground/hooks/useAugmentEventSource";
import {
  AUGMENT_DEFAULT_MODEL_ID,
  AUGMENT_DEFAULT_THINKING_LEVEL,
  AUGMENT_SANDBOX_PROVIDER,
  AUGMENT_WORKSPACE_POLICY,
  AUGMENT_WORKSPACE_PROVIDER,
} from "@/components/agent-playground/config/env";
import {
  applyServerEvent,
  createUserMessage,
  hydrateStoreFromSessionState,
  initialAugmentAssistantStore,
  safeConvertMessage,
  type AugmentAssistantStore,
} from "./messageMapping";
import { debugCapture } from "@/components/agent-playground/debug-runtime/DebugCapture";
import { latestPreviewTargetFromEvents } from "@/components/agent-playground/playground/adapters/runtimePreviewToPlayground";

function messageText(message: AppendMessage): string {
  const part = message.content?.find(
    (candidate: any) => candidate.type === "text",
  ) as { text?: string } | undefined;
  return part?.text ?? "";
}

const SESSION_URL_PARAM = "sessionId";

function readSessionIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(
    SESSION_URL_PARAM,
  );
  return value?.trim() ? value : null;
}

function writeSessionIdToUrl(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set(SESSION_URL_PARAM, sessionId);
  else url.searchParams.delete(SESSION_URL_PARAM);
  window.history.replaceState(null, "", url.toString());
}

export function useAugmentAssistantRuntime(
  client: AugmentClient = augmentClient,
) {
  const [store, setStore] = useState<AugmentAssistantStore>(
    initialAugmentAssistantStore,
  );
  const [sessionReady, setSessionReady] = useState(false);
  const [eventLog, setEventLog] = useState<ServerEvent[]>([]);
  const [debugLog, setDebugLog] = useState<
    Array<{ id: number; at: string; message: string; data?: unknown }>
  >([]);
  const [lastCommand, setLastCommand] = useState<SessionCommand | null>(null);
  const [lastCommandResult, setLastCommandResult] = useState<{
    accepted: boolean;
    error?: string | undefined;
    at: string;
    commandType: SessionCommand["type"];
  } | null>(null);
  const [pendingSend, setPendingSend] = useState<{
    sessionId: string;
    text: string;
  } | null>(null);
  const sendingRef = useRef(false);
  const debugIdRef = useRef(0);
  const storeRef = useRef(store);
  storeRef.current = store;
  // One-shot prefix prepended to the next outgoing user message, then cleared.
  // Used to silently inject context (e.g. selected template id) without
  // forcing a visible message on the user's behalf.
  const pendingPrefixRef = useRef<string | null>(null);

  const setPendingPrefix = useCallback((prefix: string | null) => {
    pendingPrefixRef.current = prefix;
  }, []);

  const sessionId = store.session?.id ?? null;

  const addDebugLog = useCallback((message: string, data?: unknown) => {
    debugIdRef.current += 1;
    const entry = {
      id: debugIdRef.current,
      at: new Date().toISOString(),
      message,
      data,
    };
    setDebugLog((current) => [...current.slice(-199), entry]);
    console.info("[augment-ui]", message, data ?? "");
  }, []);

  const reloadState = useCallback(
    async (id: string) => {
      addDebugLog("reloadState:start", { sessionId: id });
      const state = await client.getSessionState(id);
      addDebugLog("reloadState:success", {
        sessionId: state.session.id,
        threadId: state.session.threadId,
        status: state.session.status,
        messages: state.messages?.length ?? 0,
      });
      const hydrated = hydrateStoreFromSessionState(state);
      debugCapture.captureStoreUpdate("hydrate:reloadState", hydrated);
      setStore(hydrated);
    },
    [addDebugLog, client],
  );

  // Lightweight reconciliation: re-checks the server's view of `isRunning`
  // and patches the local store only if it disagrees. Safer than a full
  // hydrate during an active turn (no risk of stamping over optimistic
  // SSE-driven updates). Used to recover from missed `agent_end` /
  // `display_state_changed` events.
  const reconcileRunningFromServer = useCallback(
    async (id: string) => {
      try {
        const state = await client.getSessionState(id);
        const serverRunning = state.session?.status === "running";
        const serverDisplayRunning = state.displayState?.isRunning === true;
        const authoritativeRunning = serverRunning || serverDisplayRunning;
        setStore((current) => {
          if (current.isRunning !== authoritativeRunning) {
            addDebugLog("reconcile:isRunning:mismatch", {
              sessionId: id,
              frontend: current.isRunning,
              backend: authoritativeRunning,
              sessionStatus: state.session?.status,
            });
            return { ...current, isRunning: authoritativeRunning };
          }
          return current;
        });
      } catch (error) {
        addDebugLog("reconcile:isRunning:error", {
          sessionId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [addDebugLog, client],
  );

  const ensureThreadReady = useCallback(
    async (id: string) => {
      addDebugLog("ensureThreadReady:start", { sessionId: id });
      const state = await client.getSessionState(id);
      if (state.session.threadId) {
        addDebugLog("ensureThreadReady:already-ready", {
          sessionId: id,
          threadId: state.session.threadId,
        });
        // Skip rehydration if store already has the correct session and threadId
        // This avoids duplicate hydration in the bootstrap flow where reloadState is called first
        if (
          storeRef.current.session?.id === id &&
          storeRef.current.threadId === state.session.threadId
        ) {
          addDebugLog("ensureThreadReady:skip-rehydration", {
            sessionId: id,
            threadId: state.session.threadId,
          });
          return state.session.threadId;
        }
        const hydrated = hydrateStoreFromSessionState(state);
        debugCapture.captureStoreUpdate("hydrate:ensureThreadReady", hydrated);
        setStore(hydrated);
        return state.session.threadId;
      }

      addDebugLog("ensureThreadReady:create-thread", {
        sessionId: id,
        existingThreadCount: state.threads?.length ?? 0,
      });
      await client.sendCommand(id, { type: "createThread", payload: {} });

      const refreshed = await client.getSessionState(id);
      addDebugLog("ensureThreadReady:complete", {
        sessionId: id,
        threadId: refreshed.session.threadId,
      });
      const hydrated = hydrateStoreFromSessionState(refreshed);
      debugCapture.captureStoreUpdate(
        "hydrate:ensureThreadReady:refresh",
        hydrated,
      );
      setStore(hydrated);
      return refreshed.session.threadId;
    },
    [addDebugLog, client],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const existingSessionId = readSessionIdFromUrl();
      addDebugLog("bootstrap:start", { sessionIdFromUrl: existingSessionId });
      if (existingSessionId) {
        try {
          await reloadState(existingSessionId);
          await ensureThreadReady(existingSessionId);
          if (!cancelled) setSessionReady(true);
          return;
        } catch {
          addDebugLog("bootstrap:stale-session-url-cleared", {
            sessionId: existingSessionId,
          });
          writeSessionIdToUrl(null);
        }
      }
      if (!cancelled) {
        setSessionReady(true);
      }
    }

    bootstrap().catch((error) => {
      if (!cancelled) {
        addDebugLog("bootstrap:error", {
          error: error instanceof Error ? error.message : String(error),
        });
        setStore((current) => ({
          ...current,
          lastError: error instanceof Error ? error.message : String(error),
        }));
        setSessionReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [addDebugLog, ensureThreadReady, reloadState]);

  const onEvent = useCallback(
    (event: ServerEvent) => {
      addDebugLog("sse:event", {
        id: event.id,
        type: event.type,
        threadId: event.threadId ?? null,
      });
      debugCapture.captureSSE(event);
      setEventLog((current) => [...current.slice(-199), event]);
      setStore((current) => {
        const next = applyServerEvent(current, event);
        debugCapture.captureStoreUpdate(`sse:${event.type}`, next);
        return next;
      });
    },
    [addDebugLog],
  );

  const dispatchSessionCommand = useCallback(
    async (command: SessionCommand) => {
      if (!sessionId) return null;
      setLastCommand(command);
      try {
        const result = await client.sendCommand(sessionId, command);
        setLastCommandResult({
          accepted: result.accepted,
          error: result.error,
          at: new Date().toISOString(),
          commandType: command.type,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLastCommandResult({
          accepted: false,
          error: message,
          at: new Date().toISOString(),
          commandType: command.type,
        });
        throw error;
      }
    },
    [client, sessionId],
  );

  const ensureSessionReady = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    addDebugLog("ensureSessionReady:create-session:start");
    const session = await client.createSession({
      modelId: AUGMENT_DEFAULT_MODEL_ID,
      modeId: "build",
      workspacePolicy: AUGMENT_WORKSPACE_POLICY,
      workspaceProvider: AUGMENT_WORKSPACE_PROVIDER,
      sandboxProvider: AUGMENT_SANDBOX_PROVIDER,
      yolo: true,
    });
    addDebugLog("ensureSessionReady:create-session:success", {
      sessionId: session.id,
      threadId: session.threadId,
      modelId: session.modelId,
    });
    writeSessionIdToUrl(session.id);

    // Apply default thinking level (env-configurable). Backend default is
    // 'medium'; we override here so new sessions pick up the configured
    // level without the user toggling the selector.
    if (AUGMENT_DEFAULT_THINKING_LEVEL !== "medium") {
      try {
        await client.sendCommand(
          session.id,
          setThinkingLevelCommand(AUGMENT_DEFAULT_THINKING_LEVEL),
        );
        addDebugLog("ensureSessionReady:set-thinking-level", {
          sessionId: session.id,
          level: AUGMENT_DEFAULT_THINKING_LEVEL,
        });
      } catch (error) {
        addDebugLog("ensureSessionReady:set-thinking-level:error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    setStore((current) => ({
      ...current,
      session,
      threadId: session.threadId,
      isRunning: session.status === "running",
      lastError: null,
    }));
    await ensureThreadReady(session.id);
    return session.id;
  }, [addDebugLog, client, ensureThreadReady, sessionId]);

  const { connectionState } = useAugmentEventSource({
    client,
    sessionId,
    onEvent,
    onDebug: addDebugLog,
    onReconnectMiss: () => {
      if (sessionId) void reloadState(sessionId);
    },
  });

  // Reconcile `isRunning` when the tab regains focus or visibility — catches
  // dropped SSE events while user was on a different tab.
  useEffect(() => {
    if (!sessionId) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reconcileRunningFromServer(sessionId);
      }
    };
    const onFocus = () => {
      void reconcileRunningFromServer(sessionId);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [sessionId, reconcileRunningFromServer]);

  // While we believe a turn is running, poll the server every 15s as a safety
  // net for missed `agent_end` / `display_state_changed` events. Cheap GET
  // and only patches `isRunning`, so it won't stamp over optimistic SSE state.
  useEffect(() => {
    if (!sessionId || !store.isRunning) return;
    const RECONCILE_INTERVAL_MS = 15_000;
    const interval = setInterval(() => {
      void reconcileRunningFromServer(sessionId);
    }, RECONCILE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, store.isRunning, reconcileRunningFromServer]);

  useEffect(() => {
    if (!pendingSend || sendingRef.current) return;
    if (sessionId !== pendingSend.sessionId) return;
    if (connectionState !== "open") {
      addDebugLog("pendingSend:waiting-for-sse-open", {
        sessionId,
        connectionState,
      });
      return;
    }

    sendingRef.current = true;
    const command = sendMessageCommand(pendingSend.text);
    setLastCommand(command);
    addDebugLog("pendingSend:send-command:start", {
      sessionId: pendingSend.sessionId,
      textLength: pendingSend.text.length,
    });

    client
      .sendCommand(pendingSend.sessionId, command)
      .then((result) => {
        addDebugLog("pendingSend:send-command:result", result);
        setLastCommandResult({
          accepted: result.accepted,
          error: result.error,
          at: new Date().toISOString(),
          commandType: "sendMessage",
        });
        if (!result.accepted) {
          setStore((current) => ({
            ...current,
            isRunning: false,
            lastError:
              result.error ?? "Message command was not accepted by the server.",
          }));
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        addDebugLog("pendingSend:send-command:error", { error: message });
        setLastCommandResult({
          accepted: false,
          error: message,
          at: new Date().toISOString(),
          commandType: "sendMessage",
        });
        setStore((current) => ({
          ...current,
          isRunning: false,
          lastError: message,
        }));
      })
      .finally(() => {
        sendingRef.current = false;
        setPendingSend(null);
      });
  }, [addDebugLog, client, connectionState, pendingSend, sessionId]);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const userText = messageText(message);
      if (!userText.trim()) return;
      addDebugLog("onNew:start", {
        textLength: userText.length,
        currentSessionId: sessionId,
        connectionState,
      });
      const activeSessionId = await ensureSessionReady();
      // ensureSessionReady already calls ensureThreadReady for new sessions.
      // Calling it again here races against the optimistic store update below,
      // causing the user message to be wiped by a server-state hydration.

      // Apply one-shot prefix (e.g. selected template context) to the
      // outgoing text only. The user-visible optimistic message keeps the
      // raw text so the chat transcript stays clean.
      const prefix = pendingPrefixRef.current;
      pendingPrefixRef.current = null;
      const sendText = prefix ? `${prefix}${userText}` : userText;

      setStore((current) => ({
        ...current,
        messages: [
          ...current.messages,
          createUserMessage(userText, [...(message.attachments ?? [])]),
        ],
        isRunning: true,
      }));
      setPendingSend({ sessionId: activeSessionId, text: sendText });
    },
    [addDebugLog, connectionState, ensureSessionReady, sessionId],
  );

  const onCancel = useCallback(async () => {
    if (!sessionId) return;
    await dispatchSessionCommand({ type: "abort", payload: {} });
    setStore((current) => ({ ...current, isRunning: false }));
  }, [dispatchSessionCommand, sessionId]);

  const approveTool = useCallback(
    async (approvalId: string, decision: ApprovalDecision) => {
      if (!sessionId) return;
      await dispatchSessionCommand(approveToolCallCommand(decision));
      setStore((current) => ({
        ...current,
        pendingApprovals:
          current.pendingApprovals[0]?.id === approvalId
            ? current.pendingApprovals.slice(1)
            : current.pendingApprovals,
      }));
    },
    [dispatchSessionCommand, sessionId],
  );

  const respondToQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!sessionId) return;
      await dispatchSessionCommand(
        respondToQuestionCommand(questionId, answer),
      );
      setStore((current) => ({
        ...current,
        pendingQuestions: current.pendingQuestions.filter(
          (question) => question.id !== questionId,
        ),
        messages: current.messages.map((message) => ({
          ...message,
          content: message.content.map((part) => {
            if (part.type !== "tool-call") return part;
            if (part.toolName !== "ask_user") return part;
            if (part.args.questionId !== questionId) return part;
            return {
              ...part,
              result: { answer },
              status: { type: "complete" as const },
            };
          }),
        })),
      }));
    },
    [dispatchSessionCommand, sessionId],
  );

  const respondToToolSuspension = useCallback(
    async (resumeData: unknown) => {
      if (!sessionId) return;
      await dispatchSessionCommand(respondToToolSuspensionCommand(resumeData));
    },
    [dispatchSessionCommand, sessionId],
  );

  const submitWorkspaceEnv = useCallback(
    async (input: SubmitWorkspaceEnvInput) => {
      if (!sessionId) return;
      await dispatchSessionCommand(submitWorkspaceEnvCommand(input));
      setStore((current) => ({
        ...current,
        pendingWorkspaceEnvRequests: current.pendingWorkspaceEnvRequests.filter(
          (request) => request.id !== input.requestId,
        ),
      }));
    },
    [dispatchSessionCommand, sessionId],
  );

  const continueWithoutWorkspaceEnv = useCallback(
    async (requestId: string) => {
      if (!sessionId) return;
      await dispatchSessionCommand(skipWorkspaceEnvCommand(requestId));
      setStore((current) => ({
        ...current,
        pendingWorkspaceEnvRequests: current.pendingWorkspaceEnvRequests.filter(
          (request) => request.id !== requestId,
        ),
      }));
    },
    [dispatchSessionCommand, sessionId],
  );

  const switchMode = useCallback(
    async (modeId: string) => {
      if (!sessionId) return;
      await dispatchSessionCommand(switchModeCommand(modeId));
      setStore((current) =>
        current.session
          ? { ...current, session: { ...current.session, modeId } }
          : current,
      );
    },
    [dispatchSessionCommand, sessionId],
  );

  const setThinkingLevel = useCallback(
    async (level: ThinkingLevel) => {
      if (!sessionId) return;
      await dispatchSessionCommand(setThinkingLevelCommand(level));
      setStore((current) =>
        current.session
          ? {
              ...current,
              session: { ...current.session, thinkingLevel: level },
            }
          : current,
      );
    },
    [dispatchSessionCommand, sessionId],
  );

  const runtime = useExternalStoreRuntime({
    messages: store.messages as any,
    isRunning: store.isRunning,
    onNew: onNew as any,
    onCancel,
    convertMessage: safeConvertMessage as any,
    adapters: {
      attachments: new SimpleImageAttachmentAdapter(),
      threadList: {
        threadId: store.threadId ?? undefined,
        threads: store.threads,
        onSwitchToThread: async (threadId: string) => {
          if (!sessionId) return;
          await dispatchSessionCommand({
            type: "switchThread",
            payload: { threadId },
          });
          await reloadState(sessionId);
        },
        onSwitchToNewThread: async () => {
          if (!sessionId) return;
          await dispatchSessionCommand({ type: "createThread", payload: {} });
          await reloadState(sessionId);
        },
      },
    },
  });

  const livePreview = useMemo(
    () => latestPreviewTargetFromEvents(eventLog),
    [eventLog],
  );
  const hasLivePreview =
    livePreview?.status === "ready" ||
    livePreview?.status === "loading" ||
    livePreview?.status === "failed";

  return useMemo(
    () => ({
      runtime,
      session: store.session as AgentSession | null,
      sessionReady,
      connectionState,
      messages: store.messages,
      pendingApprovals: store.pendingApprovals,
      pendingFollowUps: store.pendingFollowUps,
      pendingWorkspaceEnvRequests: store.pendingWorkspaceEnvRequests,
      isRunning: store.isRunning,
      lastError: store.lastError,
      hasLivePreview,
      eventLog,
      debugState: {
        sessionId: store.session?.id ?? null,
        threadId: store.threadId,
        isRunning: store.isRunning,
        pendingFollowUps: store.pendingFollowUps.length,
        pendingApprovals: store.pendingApprovals.length,
        pendingWorkspaceEnvRequests: store.pendingWorkspaceEnvRequests.length,
        pendingQuestions: store.pendingQuestions.length,
        messageCount: store.messages.length,
        connectionState,
      },
      lastCommand,
      lastCommandResult,
      debugLog,
      approveTool,
      respondToQuestion,
      respondToToolSuspension,
      submitWorkspaceEnv,
      continueWithoutWorkspaceEnv,
      switchMode,
      setThinkingLevel,
      setPendingPrefix,
    }),
    [
      approveTool,
      connectionState,
      continueWithoutWorkspaceEnv,
      debugLog,
      eventLog,
      hasLivePreview,
      lastCommand,
      lastCommandResult,
      respondToQuestion,
      respondToToolSuspension,
      runtime,
      sessionReady,
      setPendingPrefix,
      setThinkingLevel,
      store,
      submitWorkspaceEnv,
      switchMode,
    ],
  );
}
