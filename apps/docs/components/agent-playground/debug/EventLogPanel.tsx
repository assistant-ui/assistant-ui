import type { ServerEvent } from '@/components/agent-playground/augment/types';
import type { ConnectionState } from '@/components/agent-playground/augment/events';

export function EventLogPanel({
  events,
  debugState,
  lastCommand,
  lastCommandResult,
  debugLog,
}: {
  events: ServerEvent[];
  debugState: {
    sessionId: string | null;
    threadId: string | null;
    isRunning: boolean;
    pendingApprovals: number;
    messageCount: number;
    connectionState: ConnectionState;
  };
  lastCommand: { type: string; payload?: unknown | undefined } | null;
  lastCommandResult: { accepted: boolean; error?: string | undefined; at: string; commandType: string } | null;
  debugLog: Array<{ id: number; at: string; message: string; data?: unknown | undefined }>;
}) {
  return (
    <aside className="scrollbar-thin w-96 shrink-0 overflow-auto border-l bg-background p-3 text-xs text-muted-foreground">
      <div className="mb-3 font-medium text-foreground">Debug</div>
      <section className="mb-3 rounded-md border bg-muted/40 p-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">State</div>
        <pre className="whitespace-pre-wrap text-[11px] text-foreground/90">{JSON.stringify(debugState, null, 2)}</pre>
      </section>
      <section className="mb-3 rounded-md border bg-muted/40 p-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Runtime log</div>
        <div className="scrollbar-thin max-h-64 space-y-2 overflow-auto">
          {debugLog.slice(-80).map((entry) => (
            <div key={entry.id} className="border-b pb-1 last:border-b-0">
              <div className="font-mono text-foreground">{entry.message}</div>
              <div className="text-muted-foreground">{entry.at}</div>
              {entry.data !== undefined ? (
                <pre className="mt-1 whitespace-pre-wrap text-[11px] text-foreground/90">{JSON.stringify(entry.data, null, 2)}</pre>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="mb-3 rounded-md border bg-muted/40 p-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Last command</div>
        <pre className="whitespace-pre-wrap text-[11px] text-foreground/90">{JSON.stringify(lastCommand, null, 2)}</pre>
      </section>
      <section className="mb-3 rounded-md border bg-muted/40 p-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Last result</div>
        <pre className="whitespace-pre-wrap text-[11px] text-foreground/90">{JSON.stringify(lastCommandResult, null, 2)}</pre>
      </section>
      <div className="mb-3 font-medium text-foreground">Events</div>
      <div className="space-y-2">
        {events.slice(-80).map((event) => (
          <div key={event.id} className="rounded-md border bg-muted/40 p-2">
            <div className="font-mono text-foreground">{event.type}</div>
            <div className="mt-1 truncate text-muted-foreground">{event.id}</div>
            <pre className="scrollbar-thin mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-foreground/90">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </aside>
  );
}
