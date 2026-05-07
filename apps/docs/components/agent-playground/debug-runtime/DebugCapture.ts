/**
 * Debug capture system for tracing the full message flow.
 *
 * Usage in browser console:
 *   window.__DEBUG_CAPTURE__.getEvents()     - Get all captured events
 *   window.__DEBUG_CAPTURE__.getSnapshots()  - Get store snapshots
 *   window.__DEBUG_CAPTURE__.export()        - Download as JSON
 *   window.__DEBUG_CAPTURE__.clear()         - Clear captured data
 *   window.__DEBUG_CAPTURE__.summary()       - Print summary
 */

export interface CapturedEvent {
  seq: number;
  ts: string;
  type: 'sse' | 'store_update' | 'render';
  eventType?: string | undefined;
  data: unknown;
}

export interface StoreSnapshot {
  seq: number;
  ts: string;
  trigger: string;
  messageCount: number;
  toolPartCount: number;
  messages: Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; toolCallId?: string; toolName?: string; hasResult?: boolean }>;
  }>;
}

class DebugCapture {
  private events: CapturedEvent[] = [];
  private snapshots: StoreSnapshot[] = [];
  private seq = 0;
  public enabled = true;

  captureSSE(event: unknown) {
    if (!this.enabled) return;
    const e = event as any;
    this.events.push({
      seq: ++this.seq,
      ts: new Date().toISOString(),
      type: 'sse',
      eventType: e.type,
      data: structuredClone(event),
    });
  }

  captureStoreUpdate(trigger: string, store: unknown) {
    if (!this.enabled) return;
    const s = store as any;
    const messages = (s.messages ?? []).map((m: any) => ({
      id: m.id?.slice(0, 12) ?? '?',
      role: m.role,
      parts: (m.content ?? []).map((p: any) => ({
        type: p.type,
        toolCallId: p.toolCallId?.slice(0, 12),
        toolName: p.toolName,
        hasResult: p.result !== undefined,
      })),
    }));

    const toolPartCount = messages.reduce(
      (sum: number, m: any) => sum + m.parts.filter((p: any) => p.type === 'tool-call').length,
      0
    );

    this.snapshots.push({
      seq: ++this.seq,
      ts: new Date().toISOString(),
      trigger,
      messageCount: messages.length,
      toolPartCount,
      messages,
    });
  }

  getEvents() {
    return this.events;
  }

  getSnapshots() {
    return this.snapshots;
  }

  clear() {
    this.events = [];
    this.snapshots = [];
    this.seq = 0;
    console.log('[DebugCapture] Cleared');
  }

  summary() {
    const sseEvents = this.events.filter(e => e.type === 'sse');
    const eventTypes = sseEvents.reduce((acc, e) => {
      acc[e.eventType ?? 'unknown'] = (acc[e.eventType ?? 'unknown'] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];

    console.log('=== DEBUG CAPTURE SUMMARY ===');
    console.log(`SSE Events: ${sseEvents.length}`);
    console.log('Event types:', eventTypes);
    console.log(`Store snapshots: ${this.snapshots.length}`);
    if (lastSnapshot) {
      console.log(`Final state: ${lastSnapshot.messageCount} messages, ${lastSnapshot.toolPartCount} tool parts`);
      console.log('Messages:', lastSnapshot.messages);
    }
    console.log('=============================');
  }

  export() {
    const data = {
      exportedAt: new Date().toISOString(),
      events: this.events,
      snapshots: this.snapshots,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-capture-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[DebugCapture] Exported');
  }

  // Compare streaming state vs hydrated state
  async compareWithServer(sessionId: string, apiBase = 'http://localhost:3001') {
    const res = await fetch(`${apiBase}/sessions/${sessionId}/state`);
    if (!res.ok) {
      console.error(`Failed to fetch server state: ${res.status} ${res.statusText}`);
      return null;
    }
    const serverState = await res.json();

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];

    console.log('=== STREAMING vs HYDRATED COMPARISON ===');
    console.log('Streaming (frontend):');
    console.log(`  Messages: ${lastSnapshot?.messageCount ?? 0}`);
    console.log(`  Tool parts: ${lastSnapshot?.toolPartCount ?? 0}`);
    if (lastSnapshot) {
      lastSnapshot.messages.forEach((m, i) => {
        console.log(`  [${i}] ${m.role} (${m.id}): ${m.parts.length} parts`);
        m.parts.filter(p => p.type === 'tool-call').forEach(p => {
          console.log(`      └─ ${p.toolName}(${p.toolCallId}) hasResult=${p.hasResult}`);
        });
      });
    }

    console.log('\nHydrated (server):');
    const serverMessages = serverState.messages ?? [];
    const serverToolParts = serverMessages.reduce((sum: number, m: any) => {
      const content = m.content ?? [];
      return sum + content.filter((p: any) => p.type === 'tool_call' || p.type === 'tool-call').length;
    }, 0);
    console.log(`  Messages: ${serverMessages.length}`);
    console.log(`  Tool parts: ${serverToolParts}`);
    serverMessages.forEach((m: any, i: number) => {
      const content = m.content ?? [];
      console.log(`  [${i}] ${m.role} (${m.id?.slice(0,12)}): ${content.length} parts`);
      content.filter((p: any) => p.type === 'tool_call' || p.type === 'tool-call').forEach((p: any) => {
        const id = p.id ?? p.toolCallId;
        const name = p.name ?? p.toolName;
        console.log(`      └─ ${name}(${id?.slice(0,12)}) hasResult=${p.result !== undefined}`);
      });
    });

    console.log('========================================');
    return { streaming: lastSnapshot, hydrated: serverState };
  }
}

// Global singleton
export const debugCapture = new DebugCapture();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).__DEBUG_CAPTURE__ = debugCapture;
}
