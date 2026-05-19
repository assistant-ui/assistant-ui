"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  ExportedMessageRepository,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { makeIssue4009Messages } from "@/lib/messages";

type ReproMode = "sync" | "async";

type Metrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  maxScrollTop: number;
  lastMessageVisible: boolean;
};

const emptyMetrics: Metrics = {
  scrollTop: 0,
  scrollHeight: 0,
  clientHeight: 0,
  maxScrollTop: 0,
  lastMessageVisible: false,
};

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const formatNumber = (value: number) => String(Math.round(value));

function SyncRuntimeProvider({
  children,
  sessionId,
}: {
  children: ReactNode;
  sessionId: number;
}) {
  const initialMessages = useMemo(
    () => makeIssue4009Messages(String(sessionId)),
    [sessionId],
  );
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function AsyncRuntimeProvider({
  children,
  onLoad,
  sessionId,
}: {
  children: ReactNode;
  onLoad: () => void;
  sessionId: number;
}) {
  const messages = useMemo(
    () => makeIssue4009Messages(String(sessionId)),
    [sessionId],
  );
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        onLoad();
        console.log("[issue-4009:async] history.load()");
        await Promise.resolve();
        return ExportedMessageRepository.fromArray(messages);
      },
      async append() {},
    }),
    [messages, onLoad],
  );
  const runtime = useLocalRuntime(adapter, { adapters: { history } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function RuntimeProvider({
  mode,
  children,
  onLoad,
  sessionId,
}: {
  mode: ReproMode;
  children: ReactNode;
  onLoad: () => void;
  sessionId: number;
}) {
  if (mode === "sync") {
    return (
      <SyncRuntimeProvider key={sessionId} sessionId={sessionId}>
        {children}
      </SyncRuntimeProvider>
    );
  }

  return (
    <AsyncRuntimeProvider key={sessionId} onLoad={onLoad} sessionId={sessionId}>
      {children}
    </AsyncRuntimeProvider>
  );
}

function MetricsPanel({
  metrics,
  messageCount,
  loadCalls,
  mode,
}: {
  metrics: Metrics;
  messageCount: number;
  loadCalls: number;
  mode: ReproMode;
}) {
  const atBottomDelta = metrics.maxScrollTop - metrics.scrollTop;
  const ready = metrics.lastMessageVisible && Math.abs(atBottomDelta) <= 2;

  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
      data-testid="diagnostics"
    >
      <div
        className="mb-4 inline-flex rounded-md border px-2.5 py-1 font-medium text-xs"
        data-ready={ready}
      >
        {ready ? "bottom visible" : "not at bottom"}
      </div>
      <h2 className="mb-3 font-semibold text-sm">Viewport diagnostics</h2>
      <dl className="grid gap-2 text-sm">
        <Metric label="scrollTop" value={formatNumber(metrics.scrollTop)} />
        <Metric
          label="scrollHeight"
          value={formatNumber(metrics.scrollHeight)}
        />
        <Metric
          label="clientHeight"
          value={formatNumber(metrics.clientHeight)}
        />
        <Metric
          label="maxScrollTop"
          value={formatNumber(metrics.maxScrollTop)}
        />
        <Metric label="bottom delta" value={formatNumber(atBottomDelta)} />
        <Metric
          label="last visible"
          value={metrics.lastMessageVisible ? "yes" : "no"}
        />
        <Metric label="messages" value={String(messageCount)} />
        <Metric
          label="history.load()"
          value={mode === "async" ? String(loadCalls) : "n/a"}
        />
      </dl>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
    </div>
  );
}

function useViewportMetrics(mode: ReproMode) {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const messageCount = useAuiState((s) => s.thread.messages.length);

  const updateMetrics = useCallback(
    (phase: string) => {
      const viewport = document.querySelector<HTMLElement>(
        '[data-slot="aui_thread-viewport"]',
      );
      if (!viewport) return;

      const messages = viewport.querySelectorAll<HTMLElement>(
        '[data-slot="aui_user-message-root"], [data-slot="aui_assistant-message-root"]',
      );
      const lastMessage = messages.item(messages.length - 1);
      const viewportRect = viewport.getBoundingClientRect();
      const lastRect = lastMessage?.getBoundingClientRect();
      const nextMetrics = {
        scrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
        maxScrollTop: Math.max(
          0,
          viewport.scrollHeight - viewport.clientHeight,
        ),
        lastMessageVisible: lastRect
          ? lastRect.bottom <= viewportRect.bottom + 4 &&
            lastRect.top >= viewportRect.top - 4
          : false,
      };

      console.log(`[issue-4009:${mode}] ${phase}`, nextMetrics);
      setMetrics(nextMetrics);
    },
    [mode],
  );

  useEffect(() => {
    updateMetrics("effect");

    const raf1 = requestAnimationFrame(() => {
      updateMetrics("raf-1");
      requestAnimationFrame(() => {
        updateMetrics("raf-2");
      });
    });

    return () => cancelAnimationFrame(raf1);
  }, [updateMetrics]);

  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="aui_thread-viewport"]',
    );
    if (!viewport) return;

    const onScroll = () => updateMetrics("scroll");
    viewport.addEventListener("scroll", onScroll);

    const resizeObserver = new ResizeObserver(() => updateMetrics("resize"));
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild);
    }

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [updateMetrics]);

  return { metrics, messageCount };
}

function ThreadHarness({
  mode,
  loadCalls,
}: {
  mode: ReproMode;
  loadCalls: number;
}) {
  const { metrics, messageCount } = useViewportMetrics(mode);

  return (
    <>
      <section className="min-h-0 overflow-hidden rounded-lg border bg-background">
        <Thread />
      </section>
      <MetricsPanel
        metrics={metrics}
        messageCount={messageCount}
        loadCalls={loadCalls}
        mode={mode}
      />
    </>
  );
}

function RouteTabs({
  mode,
  className,
}: {
  mode: ReproMode;
  className: string;
}) {
  const syncSelected = mode === "sync";
  const asyncSelected = mode === "async";

  return (
    <nav className={className} aria-label="Repro routes">
      <Link
        aria-current={syncSelected ? "page" : undefined}
        className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-background aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
        href="/sync-initial-messages"
      >
        Sync initialMessages
      </Link>
      <Link
        aria-current={asyncSelected ? "page" : undefined}
        className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-background aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
        href="/async-history-adapter"
      >
        Async history adapter
      </Link>
    </nav>
  );
}

export function ReproPage({
  mode,
  title,
  description,
}: {
  mode: ReproMode;
  title: string;
  description: string;
}) {
  const [sessionId, setSessionId] = useState(1);
  const [loadCalls, setLoadCalls] = useState(0);
  const onLoad = useCallback(() => {
    setLoadCalls((count) => count + 1);
  }, []);
  const openFreshThread = useCallback(() => {
    setLoadCalls(0);
    setSessionId((id) => id + 1);
  }, []);

  return (
    <main className="grid h-dvh grid-cols-[minmax(0,1fr)_320px] grid-rows-[auto_minmax(0,1fr)] gap-4 p-4 max-lg:grid-cols-1">
      <header className="col-span-full rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              assistant-ui issue #4009
            </p>
            <RouteTabs
              mode={mode}
              className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted p-1 sm:hidden"
            />
            <h1 className="font-semibold text-2xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground text-sm">
              {description}
            </p>
          </div>
          <RouteTabs
            mode={mode}
            className="hidden gap-1 rounded-lg border bg-muted p-1 sm:inline-flex"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <button
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground text-sm hover:bg-primary/90"
            onClick={openFreshThread}
            type="button"
          >
            Open fresh seeded thread
          </button>
          <span className="inline-flex items-center rounded-md border px-3 py-2 font-mono text-muted-foreground text-xs">
            session #{sessionId}
          </span>
          <span className="text-muted-foreground text-xs">
            Re-runs this page&apos;s initialization path without navigating.
          </span>
        </div>
      </header>

      <RuntimeProvider mode={mode} onLoad={onLoad} sessionId={sessionId}>
        <ThreadHarness mode={mode} loadCalls={loadCalls} />
      </RuntimeProvider>
    </main>
  );
}
