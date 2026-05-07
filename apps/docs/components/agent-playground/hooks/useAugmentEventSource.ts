import { useEffect, useRef, useState } from 'react';
import type { ServerEvent } from '@/components/agent-playground/augment/types';
import type { AugmentClient } from '@/components/agent-playground/augment/client';
import { shouldReloadStateAfterReconnect, type ConnectionState } from '@/components/agent-playground/augment/events';

// Must match every `event:` name the server writes (see augment/server routes/sessions.ts).
// Custom SSE event types are NOT delivered to EventSource.onmessage — only to matching listeners.
const SERVER_EVENT_TYPES = [
  'agent_start',
  'agent_end',
  'agent_follow_up_queued',
  'thread_created',
  'thread_changed',
  'message_start',
  'message_update',
  'message_end',
  'tool_input_start',
  'tool_input_delta',
  'tool_input_end',
  'tool_start',
  'tool_update',
  'tool_end',
  'tool_suspended',
  'tool_approval_required',
  'ask_question',
  'workspace_env_request_created',
  'workspace_env_updated',
  'workspace_env_skipped',
  'subagent_start',
  'subagent_text_delta',
  'subagent_tool_start',
  'subagent_tool_end',
  'subagent_end',
  'usage_update',
  'state_changed',
  'display_state_changed',
  'workspace_status_changed',
  'workspace_ready',
  'shell_output',
  'info',
  'error',
] as const;

export function useAugmentEventSource({
  client,
  sessionId,
  onEvent,
  onDebug,
  onReconnectMiss,
}: {
  client: AugmentClient;
  sessionId: string | null;
  onEvent: (event: ServerEvent) => void;
  onDebug?: (message: string, data?: unknown) => void | undefined;
  onReconnectMiss?: (() => void) | undefined;
}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const lastEventIdRef = useRef<string | null>(null);
  const seenEventIdsRef = useRef<string[]>([]);
  const seenEventIdSetRef = useRef<Set<string>>(new Set());
  const reconnectPendingRef = useRef(false);
  const firstEventAfterReconnectRef = useRef<ServerEvent | null>(null);
  const retryCountRef = useRef(0);
  const runCompletedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const onDebugRef = useRef(onDebug);
  const onReconnectMissRef = useRef(onReconnectMiss);

  useEffect(() => {
    onEventRef.current = onEvent;
    onDebugRef.current = onDebug;
    onReconnectMissRef.current = onReconnectMiss;
  }, [onDebug, onEvent, onReconnectMiss]);

  useEffect(() => {
    if (!sessionId) {
      setConnectionState('idle');
      lastEventIdRef.current = null;
      seenEventIdsRef.current = [];
      seenEventIdSetRef.current.clear();
      reconnectPendingRef.current = false;
      firstEventAfterReconnectRef.current = null;
      retryCountRef.current = 0;
      runCompletedRef.current = false;
      return;
    }

    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let eventSource: EventSource | null = null;

    const handleMessage = (message: MessageEvent<string>, eventName = 'message') => {
      try {
        const event = JSON.parse(message.data) as ServerEvent;
        const nextEventId = event.id ?? message.lastEventId ?? null;
        onDebugRef.current?.('sse:message', { id: nextEventId, eventName, type: event.type });
        if (nextEventId && seenEventIdSetRef.current.has(nextEventId)) {
          onDebugRef.current?.('sse:message:duplicate-skipped', { id: nextEventId, type: event.type });
          return;
        }
        if (nextEventId) {
          seenEventIdSetRef.current.add(nextEventId);
          seenEventIdsRef.current.push(nextEventId);
          if (seenEventIdsRef.current.length > 2000) {
            const dropped = seenEventIdsRef.current.shift();
            if (dropped) seenEventIdSetRef.current.delete(dropped);
          }
          lastEventIdRef.current = nextEventId;
        }
        if (firstEventAfterReconnectRef.current == null) {
          firstEventAfterReconnectRef.current = event;
        }
        if (event.type === 'agent_start') runCompletedRef.current = false;
        if (event.type === 'agent_end' || event.type === 'error') runCompletedRef.current = true;
        onEventRef.current(event);
      } catch {
        onDebugRef.current?.('sse:message:parse-error', { eventName, data: message.data });
        // Ignore malformed event payloads; the debug panel can show raw SSE later if needed.
      }
    };

    const connect = () => {
      if (closed) return;
      setConnectionState(lastEventIdRef.current || retryCountRef.current > 0 ? 'reconnecting' : 'connecting');
      onDebugRef.current?.('sse:connect:start', { sessionId, url: client.getEventsUrl(sessionId) });

      eventSource = new EventSource(client.getEventsUrl(sessionId));

      eventSource.onopen = () => {
        retryCountRef.current = 0;
        setConnectionState('open');
        onDebugRef.current?.('sse:open', { sessionId });
        if (reconnectPendingRef.current) {
          const shouldReload = shouldReloadStateAfterReconnect({
            wasReconnect: true,
            lastEventId: lastEventIdRef.current,
            firstEventAfterReconnect: firstEventAfterReconnectRef.current,
          });
          if (shouldReload) onReconnectMissRef.current?.();
          reconnectPendingRef.current = false;
          firstEventAfterReconnectRef.current = null;
        }
      };

      eventSource.onmessage = (message) => handleMessage(message, 'message');
      for (const eventName of SERVER_EVENT_TYPES) {
        eventSource.addEventListener(eventName, (message) => handleMessage(message as MessageEvent<string>, eventName));
      }

      eventSource.onerror = () => {
        onDebugRef.current?.('sse:error', { sessionId, readyState: eventSource?.readyState ?? null });
        eventSource?.close();
        eventSource = null;
        if (closed) return;
        if (runCompletedRef.current) {
          setConnectionState('closed');
          onDebugRef.current?.('sse:closed-after-run-complete', { sessionId });
          return;
        }
        retryCountRef.current += 1;

        // Safety net: if we've failed to reconnect several times and the agent
        // run was never completed (agent_end never arrived), synthesize an
        // agent_end so the UI doesn't stay stuck in streaming/isRunning state.
        const MAX_RETRIES_BEFORE_FORCE_END = 4;
        if (retryCountRef.current >= MAX_RETRIES_BEFORE_FORCE_END) {
          onDebugRef.current?.('sse:force-agent-end', { sessionId, retryCount: retryCountRef.current });
          runCompletedRef.current = true;
          onEventRef.current({
            id: `synthetic-agent-end-${Date.now()}`,
            sessionId: sessionId!,
            type: 'agent_end',
            payload: { type: 'agent_end', reason: 'connection_lost' },
            createdAt: new Date().toISOString(),
          });
          setConnectionState('closed');
          return;
        }

        setConnectionState('reconnecting');
        reconnectPendingRef.current = true;
        firstEventAfterReconnectRef.current = null;
        const delayMs = Math.min(10_000, 1_500 * retryCountRef.current);
        retryTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      closed = true;
      setConnectionState('closed');
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, [client, sessionId]);

  return { connectionState, lastEventId: lastEventIdRef.current };
}
