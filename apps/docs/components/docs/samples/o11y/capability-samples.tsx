"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { useAui, AuiProvider, useAuiState, AuiIf } from "@assistant-ui/store";
import {
  SpanPrimitive,
  SpanResource,
  type SpanData,
} from "@assistant-ui/react-o11y";
import { ClientOnly } from "./client-only";

function SpanLatency() {
  const latencyMs = useAuiState((s) => s.span.latencyMs) as number | null;
  return (
    <span className="text-muted-foreground ml-auto pl-3 font-mono text-xs tabular-nums">
      {latencyMs == null ? "" : `${latencyMs} ms`}
    </span>
  );
}

function TreeSpanRow() {
  return (
    <SpanPrimitive.Root className="hover:bg-accent/40 flex items-center rounded-md">
      <SpanPrimitive.Indent
        baseIndent={8}
        indentPerLevel={18}
        className="flex w-full items-center gap-2 py-1.5 pr-2"
      >
        <AuiIf condition={(s) => s.span.hasChildren}>
          <SpanPrimitive.CollapseToggle className="text-muted-foreground hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded [&_svg]:transition-transform data-[collapsed=false]:[&_svg]:rotate-90">
            <ChevronRightIcon className="size-3.5" />
          </SpanPrimitive.CollapseToggle>
        </AuiIf>
        <AuiIf condition={(s) => !s.span.hasChildren}>
          <span className="size-4 shrink-0" />
        </AuiIf>
        <SpanPrimitive.StatusIndicator className="size-2 shrink-0 rounded-full data-[span-status=completed]:bg-green-500 data-[span-status=failed]:bg-red-500 data-[span-status=running]:animate-pulse data-[span-status=running]:bg-yellow-500 data-[span-status=skipped]:bg-zinc-400" />
        <SpanPrimitive.TypeBadge className="border-border text-muted-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]" />
        <SpanPrimitive.Name className="truncate text-sm" />
        <SpanLatency />
      </SpanPrimitive.Indent>
    </SpanPrimitive.Root>
  );
}

function Tree({ spans }: { spans: SpanData[] }) {
  const aui = useAui({ span: SpanResource({ spans }) });
  return (
    <AuiProvider value={aui}>
      <div className="border-border bg-background w-full max-w-md rounded-lg border p-2">
        <SpanPrimitive.Children components={{ Span: TreeSpanRow }} />
      </div>
    </AuiProvider>
  );
}

const NOW = Date.now();

const STATUS_SPANS: SpanData[] = [
  {
    id: "s-completed",
    parentSpanId: null,
    name: "retrieve-context",
    type: "tool",
    status: "completed",
    startedAt: NOW,
    endedAt: NOW + 420,
    latencyMs: 420,
  },
  {
    id: "s-running",
    parentSpanId: null,
    name: "llm-generate",
    type: "action",
    status: "running",
    startedAt: NOW,
    endedAt: null,
    latencyMs: null,
  },
  {
    id: "s-failed",
    parentSpanId: null,
    name: "store-feedback",
    type: "action",
    status: "failed",
    startedAt: NOW,
    endedAt: NOW + 110,
    latencyMs: 110,
  },
  {
    id: "s-skipped",
    parentSpanId: null,
    name: "cache-write",
    type: "flow",
    status: "skipped",
    startedAt: NOW,
    endedAt: NOW,
    latencyMs: 0,
  },
];

export function StatusSample() {
  return (
    <ClientOnly minHeight={150}>
      <Tree spans={STATUS_SPANS} />
    </ClientOnly>
  );
}

const COLLAPSE_SPANS: SpanData[] = [
  {
    id: "c-root",
    parentSpanId: null,
    name: "agent-pipeline",
    type: "pipeline",
    status: "completed",
    startedAt: NOW,
    endedAt: NOW + 2400,
    latencyMs: 2400,
  },
  {
    id: "c-retrieve",
    parentSpanId: "c-root",
    name: "retrieve-context",
    type: "tool",
    status: "completed",
    startedAt: NOW + 20,
    endedAt: NOW + 700,
    latencyMs: 680,
  },
  {
    id: "c-vector",
    parentSpanId: "c-retrieve",
    name: "vector-search",
    type: "tool",
    status: "completed",
    startedAt: NOW + 40,
    endedAt: NOW + 460,
    latencyMs: 420,
  },
  {
    id: "c-rerank",
    parentSpanId: "c-retrieve",
    name: "rerank",
    type: "action",
    status: "completed",
    startedAt: NOW + 470,
    endedAt: NOW + 690,
    latencyMs: 220,
  },
  {
    id: "c-generate",
    parentSpanId: "c-root",
    name: "llm-generate",
    type: "action",
    status: "completed",
    startedAt: NOW + 720,
    endedAt: NOW + 2300,
    latencyMs: 1580,
  },
];

export function CollapseSample() {
  return (
    <ClientOnly minHeight={170}>
      <Tree spans={COLLAPSE_SPANS} />
    </ClientOnly>
  );
}

type StreamStep = Omit<SpanData, "status" | "endedAt" | "latencyMs">;

const STREAM_SCRIPT: StreamStep[] = [
  {
    id: "x-run",
    parentSpanId: null,
    name: "agent-run",
    type: "pipeline",
    startedAt: 0,
  },
  {
    id: "x-load",
    parentSpanId: "x-run",
    name: "load-context",
    type: "tool",
    startedAt: 0,
  },
  {
    id: "x-llm",
    parentSpanId: "x-run",
    name: "llm-call",
    type: "action",
    startedAt: 0,
  },
  {
    id: "x-stream",
    parentSpanId: "x-llm",
    name: "stream-tokens",
    type: "flow",
    startedAt: 0,
  },
  {
    id: "x-format",
    parentSpanId: "x-run",
    name: "format-response",
    type: "action",
    startedAt: 0,
  },
];

function StreamingInner() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => (c >= STREAM_SCRIPT.length ? 1 : c + 1));
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const spans = useMemo<SpanData[]>(
    () =>
      STREAM_SCRIPT.slice(0, count).map((step, i) => {
        const running = i === count - 1;
        return {
          ...step,
          status: running ? "running" : "completed",
          endedAt: running ? null : step.startedAt + 240,
          latencyMs: running ? null : 240,
        };
      }),
    [count],
  );

  return <Tree spans={spans} />;
}

export function StreamingSample() {
  return (
    <ClientOnly minHeight={170}>
      <StreamingInner />
    </ClientOnly>
  );
}
