import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimpleImageAttachmentAdapter, useExternalStoreRuntime } from "@assistant-ui/react";
import type { AppendMessage } from "@assistant-ui/react";
import { agentPlaygroundClient } from "./client";
import { approveToolCallCommand, respondToQuestionCommand, sendMessageCommand, setThinkingLevelCommand, skipWorkspaceEnvCommand, submitWorkspaceEnvCommand } from "./commands";
import { AGENT_PLAYGROUND_DEFAULT_MODEL_ID, AGENT_PLAYGROUND_DEFAULT_THINKING_LEVEL } from "./config";
import {
  applyServerEventToMessages,
  createTextMessage,
  hydrateMessagesFromState,
  pendingApprovalFromEvent,
  pendingQuestionFromEvent,
  previewFromEvent,
  textFromAppendMessage,
  workspaceEnvClearIdFromEvent,
  workspaceEnvRequestFromEvent,
  type AgentPlaygroundMessage,
  type PendingApproval,
  type PendingQuestion,
  type PendingWorkspaceEnvRequest,
  type PreviewTarget,
} from "./message-mapping";
import type { AgentSession, FrontendExampleSummary, ServerEvent, SubmitWorkspaceEnvInput } from "./types";

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";
const SESSION_URL_PARAM = "agentSessionId";

function readSessionIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(SESSION_URL_PARAM);
  return value?.trim() ? value : null;
}

function writeSessionIdToUrl(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set(SESSION_URL_PARAM, sessionId);
  else url.searchParams.delete(SESSION_URL_PARAM);
  window.history.replaceState(null, "", url.toString());
}

export function useAgentPlaygroundRuntime() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<AgentPlaygroundMessage[]>([]);
  const [eventLog, setEventLog] = useState<ServerEvent[]>([]);
  const [examples, setExamples] = useState<FrontendExampleSummary[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [pendingWorkspaceEnvRequests, setPendingWorkspaceEnvRequests] = useState<PendingWorkspaceEnvRequest[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const sourceRef = useRef<EventSource | null>(null);

  const sessionId = session?.id ?? null;
  const selectedExample = examples.find((example) => example.id === selectedExampleId);

  useEffect(() => {
    agentPlaygroundClient.listExamples().then((items) => {
      setExamples(items);
      setSelectedExampleId((current) => current ?? items[0]?.id ?? null);
    }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const loadExistingSession = useCallback(async (id: string) => {
    const state = await agentPlaygroundClient.getSessionState(id);
    setSession(state.session);
    setMessages(hydrateMessagesFromState(state));
    setIsRunning(state.session.status === "running" || state.displayState?.isRunning === true);
  }, []);

  useEffect(() => {
    const existing = readSessionIdFromUrl();
    if (!existing) return;
    loadExistingSession(existing).catch(() => writeSessionIdToUrl(null));
  }, [loadExistingSession]);

  useEffect(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    if (!sessionId) {
      setConnectionState("idle");
      return;
    }

    setConnectionState("connecting");
    const source = new EventSource(agentPlaygroundClient.getEventsUrl(sessionId));
    sourceRef.current = source;
    source.onopen = () => setConnectionState("open");
    source.onerror = () => setConnectionState("error");
    const handleEvent = (message: MessageEvent) => {
      try {
        const event = JSON.parse(message.data) as ServerEvent;
        setEventLog((current) => [...current.slice(-199), event]);
        setMessages((current) => applyServerEventToMessages(current, event));
        const nextPreview = previewFromEvent(event, selectedExample);
        if (nextPreview) setPreview(nextPreview);
        const envRequest = workspaceEnvRequestFromEvent(event);
        if (envRequest) setPendingWorkspaceEnvRequests((current) => [...current.filter((item) => item.id !== envRequest.id), envRequest]);
        const clearEnvId = workspaceEnvClearIdFromEvent(event);
        if (clearEnvId) setPendingWorkspaceEnvRequests((current) => current.filter((item) => item.id !== clearEnvId));
        const approval = pendingApprovalFromEvent(event);
        if (approval) setPendingApproval(approval);
        const question = pendingQuestionFromEvent(event);
        if (question) setPendingQuestion(question);
        if (event.type === "agent_start") setIsRunning(true);
        if (event.type === "agent_end" || event.type === "error" || event.type === "agent_error") setIsRunning(false);
      } catch {
        setError("Received an unreadable agent event.");
      }
    };
    source.onmessage = handleEvent;
    for (const eventName of ["agent_start", "agent_end", "message_start", "message_update", "message_end", "tool_start", "tool_update", "tool_end", "tool_approval_required", "ask_question", "workspace_env_request_created", "workspace_env_updated", "workspace_env_skipped", "display_state_changed", "error", "agent_error"]) {
      source.addEventListener(eventName, handleEvent);
    }
    return () => {
      source.close();
      setConnectionState("closed");
    };
  }, [selectedExample, sessionId]);

  useEffect(() => {
    const target = selectedExample?.preview?.url ? previewFromEvent({ id: "selected-example", sessionId: sessionId ?? "", type: "selected_example", payload: {}, createdAt: new Date().toISOString() }, selectedExample) : null;
    if (target) setPreview(target);
  }, [selectedExample, sessionId]);

  const ensureSession = useCallback(async () => {
    if (session) return session;
    const created = await agentPlaygroundClient.createSession({
      modelId: AGENT_PLAYGROUND_DEFAULT_MODEL_ID,
      modeId: "build",
      workspacePolicy: "auto",
      sandboxProvider: "blaxel",
    });
    setSession(created);
    writeSessionIdToUrl(created.id);
    if (AGENT_PLAYGROUND_DEFAULT_THINKING_LEVEL !== "medium") {
      await agentPlaygroundClient.sendCommand(created.id, setThinkingLevelCommand(AGENT_PLAYGROUND_DEFAULT_THINKING_LEVEL as any));
    }
    return created;
  }, [session]);

  const sendText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setMessages((current) => [...current, createTextMessage("user", trimmed)]);
    setIsRunning(true);
    try {
      const activeSession = await ensureSession();
      const prefixed = selectedExample ? "[Selected template: " + selectedExample.id + "] " + trimmed : trimmed;
      const result = await agentPlaygroundClient.sendCommand(activeSession.id, sendMessageCommand(prefixed));
      if (!result.accepted) {
        setError(result.error ?? "The backend rejected the message.");
        setIsRunning(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsRunning(false);
    }
  }, [ensureSession, selectedExample]);

  const runtime = useExternalStoreRuntime({
    messages: messages as any,
    isRunning,
    onNew: (message: AppendMessage) => sendText(textFromAppendMessage(message)),
    onCancel: async () => {
      if (!sessionId) return;
      await agentPlaygroundClient.sendCommand(sessionId, { type: "abort", payload: {} });
      setIsRunning(false);
    },
    convertMessage: (message: any) => message,
    adapters: { attachments: new SimpleImageAttachmentAdapter() },
  });

  const submitWorkspaceEnv = useCallback(async (input: SubmitWorkspaceEnvInput) => {
    if (!sessionId) return;
    await agentPlaygroundClient.sendCommand(sessionId, submitWorkspaceEnvCommand(input));
    setPendingWorkspaceEnvRequests((current) => current.filter((request) => request.id !== input.requestId));
  }, [sessionId]);

  const skipWorkspaceEnv = useCallback(async (requestId: string) => {
    if (!sessionId) return;
    await agentPlaygroundClient.sendCommand(sessionId, skipWorkspaceEnvCommand(requestId));
    setPendingWorkspaceEnvRequests((current) => current.filter((request) => request.id !== requestId));
  }, [sessionId]);

  const respondToApproval = useCallback(async (decision: "approve" | "decline" | "always_allow_category") => {
    if (!sessionId) return;
    await agentPlaygroundClient.sendCommand(sessionId, approveToolCallCommand(decision));
    setPendingApproval(null);
  }, [sessionId]);

  const respondToQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!sessionId) return;
    await agentPlaygroundClient.sendCommand(sessionId, respondToQuestionCommand(questionId, answer));
    setPendingQuestion(null);
  }, [sessionId]);

  const exportWorkspace = useCallback(async () => {
    if (!sessionId) return;
    const download = await agentPlaygroundClient.exportWorkspace(sessionId);
    const url = URL.createObjectURL(download.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = download.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sessionId]);

  const resetSession = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setSession(null);
    setMessages([]);
    setEventLog([]);
    setPendingWorkspaceEnvRequests([]);
    setPendingApproval(null);
    setPendingQuestion(null);
    setIsRunning(false);
    setError(null);
    setConnectionState("idle");
    writeSessionIdToUrl(null);
  }, []);

  return useMemo(() => ({
    runtime,
    session,
    messages,
    eventLog,
    examples,
    selectedExampleId,
    selectExample: setSelectedExampleId,
    preview,
    pendingWorkspaceEnvRequests,
    pendingApproval,
    pendingQuestion,
    isRunning,
    error,
    connectionState,
    sendText,
    submitWorkspaceEnv,
    skipWorkspaceEnv,
    respondToApproval,
    respondToQuestion,
    exportWorkspace,
    resetSession,
  }), [connectionState, error, eventLog, examples, exportWorkspace, isRunning, messages, pendingApproval, pendingQuestion, pendingWorkspaceEnvRequests, preview, resetSession, respondToApproval, respondToQuestion, runtime, selectedExampleId, sendText, session, skipWorkspaceEnv, submitWorkspaceEnv]);
}
