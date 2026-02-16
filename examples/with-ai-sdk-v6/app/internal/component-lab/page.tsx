"use client";

import {
  AssistantRuntimeProvider,
  useAui,
  type ComponentMessagePartComponent,
  type TextMessagePartComponent,
} from "@assistant-ui/react";
import {
  unstable_AISDK_JSON_RENDER_COMPONENT_NAME,
  AssistantChatTransport,
  unstable_JsonRenderHost as UnstableJsonRenderHost,
  type AISDKRuntimeAdapter,
  type unstable_AISDKDataSpecTelemetryEvent,
  type unstable_JsonRenderHostCatalog,
  type unstable_JsonRenderHostCatalogRenderer,
  type unstable_JsonRenderHostCatalogTelemetryEvent,
} from "@assistant-ui/react-ai-sdk";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

type Scenario =
  | "component-part"
  | "json-render-patch"
  | "json-render-guards"
  | "mixed"
  | "chaos"
  | "json-patch-semantics"
  | "missing-instance"
  | "parent-graph";

type InvokeMode = "success" | "fail" | "timeout";
type CatalogMode = "byType" | "fallback-only" | "override";

type ScenarioDefinition = {
  id: Scenario;
  title: string;
  description: string;
  matrixInvokeTarget?: string | undefined;
};

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "component-part",
    title: "Component Part",
    description: "Validates data-component -> component rendering + fallback.",
    matrixInvokeTarget: "componentDemo1",
  },
  {
    id: "json-render-patch",
    title: "json-render Patch",
    description: "Validates seq ordering and JSON patch application.",
    matrixInvokeTarget: "specDemo1",
  },
  {
    id: "json-render-guards",
    title: "json-render Guards",
    description: "Validates stale seq + malformed patch guardrails.",
    matrixInvokeTarget: "specDemo2",
  },
  {
    id: "mixed",
    title: "Mixed",
    description: "Runs both native component and json-render in one response.",
    matrixInvokeTarget: "specDemo3",
  },
  {
    id: "chaos",
    title: "Chaos",
    description:
      "Interleaved multi-instance updates with duplicate/out-of-order seq.",
    matrixInvokeTarget: "specChaosA",
  },
  {
    id: "json-patch-semantics",
    title: "Patch Semantics",
    description:
      "Covers add/replace/remove, array -, root replace, escaped keys.",
    matrixInvokeTarget: "specPatchSemantics",
  },
  {
    id: "missing-instance",
    title: "Missing instanceId",
    description: "Validates explicit invoke errors for missing instanceId.",
  },
  {
    id: "parent-graph",
    title: "Parent Graph",
    description: "Validates parentId-linked component graph across both lanes.",
    matrixInvokeTarget: "graphChild",
  },
];

const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
) as Record<Scenario, ScenarioDefinition>;

const STORY_AUDIENCE_NOTES = [
  {
    audience: "PM",
    note: "Ship richer assistant moments with reliability guarantees (instance continuity, monotonic seq, stale guards).",
  },
  {
    audience: "Design",
    note: "Compose native and spec-driven blocks in one thread, with catalog fallback and override controls for safe iteration.",
  },
  {
    audience: "Engineering",
    note: "Adopt a deterministic runtime contract where every interactive node is addressable by instanceId and extendable via component mappings.",
  },
] as const;

const STORY_WALKTHROUGH = [
  {
    step: "1",
    scenario: "Component Part",
    goal: "Show native component rendering and graceful fallback in the same response.",
  },
  {
    step: "2",
    scenario: "json-render Guards",
    goal: "Show stale seq + malformed patch protection with telemetry counters proving dropped updates.",
  },
  {
    step: "3",
    scenario: "Mixed",
    goal: "Show component parts and json-render specs coexisting in one deterministic interaction model.",
  },
] as const;

const SNAPSHOT_STORAGE_KEY = "component-lab:thread-snapshot";
const REHYDRATE_ON_RELOAD_KEY = "component-lab:rehydrate-on-reload";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getSpecProps = (spec: unknown): Record<string, unknown> => {
  if (!isObjectRecord(spec)) return {};
  const props = spec.props;
  return isObjectRecord(props) ? props : {};
};

const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const getNumberRecord = (value: unknown): Record<string, number> => {
  if (!isObjectRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
};

const useComponentParentId = (instanceId: string | undefined) => {
  const aui = useAui();
  if (!instanceId) return undefined;
  try {
    return aui.message().component({ instanceId }).getState().parentId;
  } catch {
    return undefined;
  }
};

const invokeWithTimeout = async (
  invoke: (action: string, payload?: unknown) => Promise<unknown>,
  action: string,
  payload: unknown,
  timeoutMs = 1600,
) => {
  return Promise.race([
    invoke(action, payload),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Invoke timeout (no ack)")), timeoutMs);
    }),
  ]);
};

const DemoTextPart: TextMessagePartComponent = ({ text }) => {
  return <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>;
};

const StatusCardPart: ComponentMessagePartComponent = ({
  instanceId,
  props,
}) => {
  const aui = useAui();
  const component = instanceId
    ? aui.message().component({ instanceId })
    : undefined;
  const parentId = useComponentParentId(instanceId);

  const cardProps = (props ?? {}) as {
    title?: string;
    status?: string;
    details?: string;
    checkList?: string[];
  };

  const [invokeResult, setInvokeResult] = useState<string>("");
  const [invokeError, setInvokeError] = useState<string>("");

  const runInvoke = async () => {
    setInvokeError("");
    try {
      if (!component) throw new Error("Missing instanceId");
      const result = await invokeWithTimeout(component.invoke, "refresh", {
        source: "status-card",
      });
      setInvokeResult(JSON.stringify(result));
    } catch (error) {
      setInvokeError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-border bg-muted p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">
          {cardProps.title ?? "Status Card"}
        </div>
        <div className="rounded-full border border-border px-2 py-[2px] text-[10px] uppercase">
          native component
        </div>
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        status: {cardProps.status ?? "unknown"}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        instance={instanceId ?? "missing"} parent={parentId ?? "none"}
      </div>
      {cardProps.details ? (
        <div className="mt-1 text-muted-foreground text-xs">
          {cardProps.details}
        </div>
      ) : null}
      {Array.isArray(cardProps.checkList) ? (
        <ul className="mt-2 list-disc pl-4 text-muted-foreground text-xs">
          {cardProps.checkList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-md border border-border px-2 py-1 text-xs"
          onClick={runInvoke}
          type="button"
        >
          invoke(refresh)
        </button>
        <button
          className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40"
          onClick={() => component?.emit("selected", { source: "status-card" })}
          type="button"
          disabled={!component}
        >
          emit(selected)
        </button>
      </div>
      {invokeResult ? (
        <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]">
          {invokeResult}
        </pre>
      ) : null}
      {invokeError ? (
        <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-700">
          {invokeError}
        </div>
      ) : null}
    </div>
  );
};

type JsonRenderDemoAction = {
  id: string;
  label: string;
  type: "invoke" | "emit";
  name: string;
  payload: unknown;
};

const JsonRenderActionDock: FC<{
  actions: readonly JsonRenderDemoAction[];
  invoke: (action: string, payload?: unknown) => Promise<unknown>;
  emit: (event: string, payload?: unknown) => void;
  resultTestId: string;
}> = ({ actions, invoke, emit, resultTestId }) => {
  const [invokeResult, setInvokeResult] = useState<string>("");
  const [invokeError, setInvokeError] = useState<string>("");
  const [emitResult, setEmitResult] = useState<string>("");

  const runAction = async (action: JsonRenderDemoAction) => {
    if (action.type === "emit") {
      emit(action.name, action.payload);
      setEmitResult(`${action.name} emitted`);
      return;
    }

    setInvokeError("");
    try {
      const result = await invokeWithTimeout(
        invoke,
        action.name,
        action.payload,
      );
      setInvokeResult(JSON.stringify(result));
    } catch (error) {
      setInvokeError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`rounded-md px-2.5 py-1.5 font-semibold text-[11px] ${
              action.type === "invoke"
                ? "border border-foreground bg-foreground text-background"
                : "border border-border bg-background text-muted-foreground"
            }`}
            onClick={() => {
              void runAction(action);
            }}
            type="button"
            data-testid={action.id}
          >
            {action.label}
          </button>
        ))}
      </div>
      {invokeResult ? (
        <pre
          className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]"
          data-testid={resultTestId}
        >
          {invokeResult}
        </pre>
      ) : null}
      {emitResult ? (
        <div className="mt-2 rounded bg-muted p-2 text-[11px] text-muted-foreground">
          {emitResult}
        </div>
      ) : null}
      {invokeError ? (
        <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-700">
          {invokeError}
        </div>
      ) : null}
    </>
  );
};

const JsonRendererMeta: FC<{
  badge: string;
  specType: string | undefined;
  instanceId: string | undefined;
}> = ({ badge, specType, instanceId }) => {
  const parentId = useComponentParentId(instanceId);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
      <span
        className="rounded-full border border-border px-2 py-[2px] uppercase"
        data-testid="catalog-path-badge"
      >
        {badge}
      </span>
      <span className="text-muted-foreground">
        type={specType ?? "unknown"}
      </span>
      <span className="text-muted-foreground">
        instance={instanceId ?? "missing"}
      </span>
      <span className="text-muted-foreground">parent={parentId ?? "none"}</span>
    </div>
  );
};

const StatusBoardRenderer: unstable_JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  const props = getSpecProps(spec);
  const title =
    typeof props.title === "string" ? props.title : "Untitled Status Board";
  const state = typeof props.state === "string" ? props.state : "unknown";
  const items = getStringArray(props.items);
  const stateTone =
    state === "complete"
      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
      : state === "verifying"
        ? "border-amber-300 bg-amber-100 text-amber-900"
        : "border-blue-300 bg-blue-100 text-blue-900";

  return (
    <div
      className="mt-2 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-4 shadow-sm"
      data-testid="json-render-status-board"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[10px] text-emerald-700 uppercase tracking-[0.12em]">
            Release Control Center
          </div>
          <div className="mt-1 font-semibold text-emerald-950 text-sm">
            {title}
          </div>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 font-semibold text-[10px] uppercase ${stateTone}`}
        >
          {state}
        </div>
      </div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-background px-2.5 py-2 text-emerald-900 text-xs"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 font-semibold text-[10px]">
                {index + 1}
              </span>
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      ) : null}
      <JsonRenderActionDock
        actions={[
          {
            id: "status-board-promote-release",
            label: "Promote Release",
            type: "invoke",
            name: "promoteRelease",
            payload: {
              source: "status-board",
              target: "production",
            },
          },
          {
            id: "status-board-subscribe-updates",
            label: "Subscribe Updates",
            type: "emit",
            name: "subscribeUpdates",
            payload: {
              source: "status-board",
              channel: "release-feed",
            },
          },
        ]}
        invoke={invoke}
        emit={emit}
        resultTestId="status-board-invoke-result"
      />
    </div>
  );
};

const AuditLogRenderer: unstable_JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  const props = getSpecProps(spec);
  const title = typeof props.title === "string" ? props.title : "Audit Log";
  const status = typeof props.status === "string" ? props.status : "baseline";
  const entries = getStringArray(props.entries);

  return (
    <div
      className="mt-2 rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-50 via-background to-sky-50 p-4 shadow-sm"
      data-testid="json-render-audit-log"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[10px] text-cyan-700 uppercase tracking-[0.12em]">
            Compliance Timeline
          </div>
          <div className="mt-1 font-semibold text-cyan-950 text-sm">
            {title}
          </div>
        </div>
        <div className="rounded-full border border-cyan-300 bg-cyan-100 px-2.5 py-1 font-semibold text-[10px] text-cyan-900 uppercase">
          {status}
        </div>
      </div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      {entries.length > 0 ? (
        <div className="mt-3 space-y-2">
          {entries.map((entry, index) => (
            <div
              key={`${entry}-${index}`}
              className="relative rounded-xl border border-cyan-200 bg-background px-3 py-2 text-cyan-950 text-xs"
            >
              <span className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-cyan-300" />
              <span className="pl-1">{entry}</span>
            </div>
          ))}
        </div>
      ) : null}
      <JsonRenderActionDock
        actions={[
          {
            id: "audit-log-ack-latest",
            label: "Acknowledge Latest",
            type: "invoke",
            name: "ackLatest",
            payload: {
              source: "audit-log",
              strategy: "latest-only",
            },
          },
          {
            id: "audit-log-escalate",
            label: "Escalate Incident",
            type: "emit",
            name: "escalateIncident",
            payload: {
              source: "audit-log",
              severity: "high",
            },
          },
        ]}
        invoke={invoke}
        emit={emit}
        resultTestId="audit-log-invoke-result"
      />
    </div>
  );
};

const MetricsRenderer: unstable_JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  const props = getSpecProps(spec);
  const title = typeof props.title === "string" ? props.title : "Metrics";
  const metrics = getNumberRecord(props.values);
  const critical =
    typeof metrics.errors === "number" && metrics.errors > 0
      ? "attention"
      : "healthy";

  return (
    <div
      className="mt-2 rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-50 via-background to-fuchsia-50 p-4 shadow-sm"
      data-testid="json-render-metrics"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[10px] text-violet-700 uppercase tracking-[0.12em]">
            Health Monitor
          </div>
          <div className="mt-1 font-semibold text-sm text-violet-950">
            {title}
          </div>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 font-semibold text-[10px] uppercase ${
            critical === "attention"
              ? "border-rose-300 bg-rose-100 text-rose-900"
              : "border-violet-300 bg-violet-100 text-violet-900"
          }`}
        >
          {critical}
        </div>
      </div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {Object.entries(metrics).map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-violet-200 bg-background px-2.5 py-2 text-violet-900"
          >
            <div className="font-semibold text-[10px] text-violet-600 uppercase tracking-wide">
              {key}
            </div>
            <div className="mt-1 font-semibold text-lg leading-none">
              {value}
            </div>
          </div>
        ))}
      </div>
      <JsonRenderActionDock
        actions={[
          {
            id: "metrics-refresh-live",
            label: "Refresh Live Metrics",
            type: "invoke",
            name: "refreshLiveMetrics",
            payload: {
              source: "metrics",
              include: Object.keys(metrics),
            },
          },
          {
            id: "metrics-watch-errors",
            label: "Watch Error Spike",
            type: "emit",
            name: "watchErrors",
            payload: {
              source: "metrics",
              threshold: 1,
            },
          },
        ]}
        invoke={invoke}
        emit={emit}
        resultTestId="metrics-invoke-result"
      />
    </div>
  );
};

const JsonCatalogFallbackRenderer: unstable_JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  return (
    <div
      className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3"
      data-testid="json-render-fallback"
    >
      <div className="font-semibold text-sm">
        json-render fallback: {specType ?? "unknown"}
      </div>
      <JsonRendererMeta
        badge="catalog-fallback"
        specType={specType}
        instanceId={instanceId}
      />
      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]">
        {JSON.stringify(spec, null, 2)}
      </pre>
      <JsonRenderActionDock
        actions={[
          {
            id: "fallback-inspect-spec",
            label: "Inspect Spec Contract",
            type: "invoke",
            name: "inspectSpecContract",
            payload: {
              source: "fallback",
              specType: specType ?? "unknown",
            },
          },
          {
            id: "fallback-request-mapping",
            label: "Request Mapping",
            type: "emit",
            name: "requestMapping",
            payload: {
              source: "fallback",
              specType: specType ?? "unknown",
            },
          },
        ]}
        invoke={invoke}
        emit={emit}
        resultTestId="fallback-invoke-result"
      />
    </div>
  );
};

const JsonCatalogOverrideRenderer: unstable_JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  return (
    <div
      className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-3"
      data-testid="json-render-override"
    >
      <div className="font-semibold text-sm">json-render override renderer</div>
      <JsonRendererMeta
        badge="catalog-override"
        specType={specType}
        instanceId={instanceId}
      />
      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]">
        {JSON.stringify(spec, null, 2)}
      </pre>
      <JsonRenderActionDock
        actions={[
          {
            id: "override-force-preview",
            label: "Force Preview Refresh",
            type: "invoke",
            name: "overrideForcePreview",
            payload: {
              source: "override",
              specType: specType ?? "unknown",
            },
          },
          {
            id: "override-track-selection",
            label: "Track Selection",
            type: "emit",
            name: "overrideTrackSelection",
            payload: {
              source: "override",
              specType: specType ?? "unknown",
            },
          },
        ]}
        invoke={invoke}
        emit={emit}
        resultTestId="override-invoke-result"
      />
    </div>
  );
};

const UnknownComponentPart: ComponentMessagePartComponent = ({
  name,
  props,
  instanceId,
}) => {
  const parentId = useComponentParentId(instanceId);

  return (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
      <div className="font-semibold">Fallback component renderer: {name}</div>
      <div className="mt-1 text-[11px] text-amber-900">
        instance={instanceId ?? "missing"} parent={parentId ?? "none"}
      </div>
      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]">
        {JSON.stringify(props ?? {}, null, 2)}
      </pre>
    </div>
  );
};

type MatrixScenarioResult = {
  scenario: Scenario;
  pass: boolean;
  details: string;
  finalSpecState: string;
};

type MatrixSummary = {
  runs: number;
  passes: number;
  failures: number;
  invokeReceipts: number;
  emitReceipts: number;
  staleSeqIgnored: number;
  malformedPatchDropped: number;
  catalogHit: number;
  catalogFallback: number;
  catalogOverride: number;
  catalogMiss: number;
  results: MatrixScenarioResult[];
};

type NormalizedComponentPart = {
  name: string;
  instanceId?: string;
  parentId?: string;
  specType?: string;
  specProps?: Record<string, unknown>;
  props?: Record<string, unknown>;
};

const normalizeComponentParts = (
  assistantMessage: any,
): NormalizedComponentPart[] => {
  const parts = Array.isArray(assistantMessage?.content)
    ? assistantMessage.content
    : [];

  return parts
    .filter(
      (part: any): part is any =>
        isObjectRecord(part) &&
        part.type === "component" &&
        typeof part.name === "string",
    )
    .map((part: any) => {
      const props = isObjectRecord(part.props) ? part.props : undefined;
      const spec = props?.spec;
      const specProps = getSpecProps(spec);
      const instanceId =
        typeof part.instanceId === "string" ? part.instanceId : undefined;
      const parentId =
        typeof part.parentId === "string" ? part.parentId : undefined;
      const specType =
        isObjectRecord(spec) && typeof spec.type === "string"
          ? spec.type
          : undefined;
      return {
        name: part.name,
        ...(instanceId ? { instanceId } : {}),
        ...(parentId ? { parentId } : {}),
        ...(specType ? { specType } : {}),
        ...(Object.keys(specProps).length > 0 ? { specProps } : {}),
        ...(props ? { props } : {}),
      } satisfies NormalizedComponentPart;
    });
};

const formatSpecState = (parts: NormalizedComponentPart[]) => {
  const jsonSpecs = parts
    .filter(
      (part) =>
        part.name === unstable_AISDK_JSON_RENDER_COMPONENT_NAME &&
        part.instanceId,
    )
    .map((part) => ({
      instanceId: part.instanceId,
      parentId: part.parentId,
      specType: part.specType,
      specProps: part.specProps,
    }));

  return JSON.stringify(jsonSpecs, null, 2);
};

const evaluateScenario = (
  scenario: Scenario,
  parts: NormalizedComponentPart[],
  telemetryDelta: { staleSeqIgnored: number; malformedPatchDropped: number },
): { pass: boolean; details: string } => {
  const byInstance = new Map(parts.map((part) => [part.instanceId, part]));

  if (scenario === "component-part") {
    const hasStatusCard = parts.some(
      (part) =>
        part.name === "status-card" && part.instanceId === "componentDemo1",
    );
    const hasFallback = parts.some((part) => part.name === "unknown-demo");
    return {
      pass: hasStatusCard && hasFallback,
      details: `status-card=${hasStatusCard} fallback=${hasFallback}`,
    };
  }

  if (scenario === "json-render-patch") {
    const spec = byInstance.get("specDemo1")?.specProps;
    const pass =
      spec?.state === "complete" &&
      getStringArray(spec.items).includes("Release");
    return {
      pass,
      details: `state=${String(spec?.state)} items=${getStringArray(
        spec?.items,
      ).join(",")}`,
    };
  }

  if (scenario === "json-render-guards") {
    const spec = byInstance.get("specDemo2")?.specProps;
    const pass =
      spec?.status === "recovered" &&
      telemetryDelta.staleSeqIgnored >= 1 &&
      telemetryDelta.malformedPatchDropped >= 1;
    return {
      pass,
      details: `status=${String(spec?.status)} staleDelta=${telemetryDelta.staleSeqIgnored} malformedDelta=${telemetryDelta.malformedPatchDropped}`,
    };
  }

  if (scenario === "mixed") {
    const metrics = byInstance.get("specDemo3");
    const fallback = byInstance.get("specDemoFallback");
    const pass =
      metrics?.specType === "metrics" &&
      fallback?.specType === "unknown-widget";
    return {
      pass,
      details: `metricsType=${metrics?.specType ?? "none"} fallbackType=${fallback?.specType ?? "none"}`,
    };
  }

  if (scenario === "chaos") {
    const specA = byInstance.get("specChaosA")?.specProps;
    const specB = byInstance.get("specChaosB")?.specProps;
    const errors = getNumberRecord(specA?.values).errors;
    const pass =
      getNumberRecord(specA?.values).p95 === 180 &&
      errors === 2 &&
      specB?.state === "complete" &&
      telemetryDelta.staleSeqIgnored >= 2 &&
      telemetryDelta.malformedPatchDropped >= 1;
    return {
      pass,
      details: `a.p95=${String(getNumberRecord(specA?.values).p95)} a.errors=${String(errors)} b.state=${String(specB?.state)} staleDelta=${telemetryDelta.staleSeqIgnored} malformedDelta=${telemetryDelta.malformedPatchDropped}`,
    };
  }

  if (scenario === "json-patch-semantics") {
    const spec = byInstance.get("specPatchSemantics")?.specProps;
    const complex = isObjectRecord(spec?.complex) ? spec?.complex : {};
    const list = getStringArray(spec?.list);
    const entries = getStringArray(spec?.entries);
    const pass =
      spec?.status === "phase-3" &&
      list.length === 1 &&
      list[0] === "two" &&
      complex["a/b"] === "slash-2" &&
      complex["a~b"] === "tilde-2" &&
      entries.length === 1 &&
      entries[0] === "appended";

    return {
      pass,
      details: `status=${String(spec?.status)} list=${list.join(",")} entries=${entries.join(",")} a/b=${String(
        complex["a/b"],
      )} a~b=${String(complex["a~b"])}`,
    };
  }

  if (scenario === "missing-instance") {
    const missingStatusCard = parts.some(
      (part) => part.name === "status-card" && !part.instanceId,
    );
    const missingJsonRender = parts.some(
      (part) =>
        part.name === unstable_AISDK_JSON_RENDER_COMPONENT_NAME &&
        !part.instanceId,
    );
    return {
      pass: missingStatusCard && missingJsonRender,
      details: `nativeMissing=${missingStatusCard} jsonMissing=${missingJsonRender}`,
    };
  }

  const parent = byInstance.get("graphParent");
  const child = byInstance.get("graphChild");
  const graphSpec = byInstance.get("graphSpec");
  const nestedSpec = byInstance.get("graphSpecChild");
  const pass =
    !parent?.parentId &&
    child?.parentId === "graphParent" &&
    graphSpec?.parentId === "graphChild" &&
    nestedSpec?.parentId === "graphSpec";
  return {
    pass,
    details: `childParent=${child?.parentId ?? "none"} graphSpecParent=${graphSpec?.parentId ?? "none"} nestedParent=${nestedSpec?.parentId ?? "none"}`,
  };
};

export default function ComponentPartLabPage() {
  const [scenario, setScenario] = useState<Scenario>("component-part");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const telemetryCountersRef = useRef({
    staleSeqIgnored: 0,
    malformedPatchDropped: 0,
  });
  const [telemetry, setTelemetry] = useState({
    ...telemetryCountersRef.current,
  });
  const [catalogTelemetry, setCatalogTelemetry] = useState({
    catalogHit: 0,
    catalogFallback: 0,
    catalogOverride: 0,
    catalogMiss: 0,
  });
  const [invokeMode, setInvokeMode] = useState<InvokeMode>("success");
  const [emitEnabled, setEmitEnabled] = useState(true);
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("byType");
  const [invokeReceipts, setInvokeReceipts] = useState(0);
  const [emitReceipts, setEmitReceipts] = useState(0);
  const [matrixSummary, setMatrixSummary] = useState<MatrixSummary | null>(
    null,
  );
  const [isMatrixRunning, setIsMatrixRunning] = useState(false);
  const [snapshotMeta, setSnapshotMeta] = useState<{
    savedAt: string;
    messageCount: number;
  } | null>(null);

  const appendEvent = useCallback((line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [`[${timestamp}] ${line}`, ...prev].slice(0, 80));
  }, []);

  const appendEventDeferred = useCallback(
    (line: string) => {
      queueMicrotask(() => appendEvent(line));
    },
    [appendEvent],
  );

  const onDataSpecTelemetry = useCallback(
    (event: unstable_AISDKDataSpecTelemetryEvent) => {
      const currentCounters = telemetryCountersRef.current;
      const nextCounters =
        event.type === "stale-seq-ignored"
          ? {
              ...currentCounters,
              staleSeqIgnored: currentCounters.staleSeqIgnored + 1,
            }
          : {
              ...currentCounters,
              malformedPatchDropped: currentCounters.malformedPatchDropped + 1,
            };

      telemetryCountersRef.current = nextCounters;
      queueMicrotask(() => setTelemetry(nextCounters));
      appendEventDeferred(
        `telemetry ${event.type} instance=${event.instanceId} ${"seq" in event ? `seq=${event.seq}` : ""}`,
      );
    },
    [appendEventDeferred],
  );

  const onCatalogTelemetry = useCallback(
    (event: unstable_JsonRenderHostCatalogTelemetryEvent) => {
      setCatalogTelemetry((prev) => ({
        catalogHit: prev.catalogHit + (event.type === "catalog-hit" ? 1 : 0),
        catalogFallback:
          prev.catalogFallback + (event.type === "catalog-fallback" ? 1 : 0),
        catalogOverride:
          prev.catalogOverride + (event.type === "catalog-override" ? 1 : 0),
        catalogMiss: prev.catalogMiss + (event.type === "catalog-miss" ? 1 : 0),
      }));
      appendEventDeferred(
        `catalog ${event.type} instance=${event.instanceId ?? "missing"} specType=${event.specType ?? "unknown"}`,
      );
    },
    [appendEventDeferred],
  );

  const onComponentInvoke = useCallback(
    async ({
      messageId,
      instanceId,
      action,
      payload,
    }: Parameters<
      NonNullable<AISDKRuntimeAdapter["onComponentInvoke"]>
    >[0]) => {
      setInvokeReceipts((prev) => prev + 1);
      appendEventDeferred(
        `invoke action=${action} mode=${invokeMode} message=${messageId} instance=${instanceId}`,
      );

      if (invokeMode === "fail" || action === "fail") {
        throw new Error("Simulated invoke error");
      }

      if (invokeMode === "timeout") {
        return await new Promise<never>(() => {
          // intentionally unresolved to validate timeout/no-ack behavior
        });
      }

      return {
        ok: true,
        action,
        messageId,
        instanceId,
        payload,
        timestamp: new Date().toISOString(),
      };
    },
    [appendEventDeferred, invokeMode],
  );

  const onComponentEmit = useCallback(
    ({
      messageId,
      instanceId,
      event,
      payload,
    }: Parameters<NonNullable<AISDKRuntimeAdapter["onComponentEmit"]>>[0]) => {
      setEmitReceipts((prev) => prev + 1);
      if (!emitEnabled) {
        appendEventDeferred(
          `emit dropped (disabled) event=${event} message=${messageId} instance=${instanceId}`,
        );
        return;
      }
      appendEventDeferred(
        `emit event=${event} message=${messageId} instance=${instanceId} payload=${JSON.stringify(payload)}`,
      );
    },
    [appendEventDeferred, emitEnabled],
  );

  const unstable_dataSpec = useMemo(
    () => ({
      onTelemetry: onDataSpecTelemetry,
    }),
    [onDataSpecTelemetry],
  );

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: `/api/chat-component-lab?scenario=${scenario}`,
      }),
    [scenario],
  );

  const runtime = useChatRuntime({
    transport,
    onComponentInvoke,
    onComponentEmit,
    unstable_dataSpec,
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      setSnapshotMeta(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        savedAt?: unknown;
        messageCount?: unknown;
      };
      if (
        typeof parsed.savedAt === "string" &&
        typeof parsed.messageCount === "number"
      ) {
        setSnapshotMeta({
          savedAt: parsed.savedAt,
          messageCount: parsed.messageCount,
        });
      }
    } catch {
      setSnapshotMeta(null);
    }
  }, []);

  useEffect(() => {
    const shouldRehydrate =
      window.sessionStorage.getItem(REHYDRATE_ON_RELOAD_KEY) === "1";
    if (!shouldRehydrate) return;

    window.sessionStorage.removeItem(REHYDRATE_ON_RELOAD_KEY);
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      appendEventDeferred("reload rehydrate skipped: no saved snapshot");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        repository?: unknown;
        messageCount?: unknown;
      };
      if (!parsed.repository) {
        appendEventDeferred(
          "reload rehydrate failed: malformed snapshot payload",
        );
        return;
      }
      runtime.thread.import(parsed.repository as any);
      appendEventDeferred(
        `reload rehydrate complete: restored ${String(parsed.messageCount ?? "?")} messages`,
      );
    } catch {
      appendEventDeferred("reload rehydrate failed: snapshot parse error");
    }
  }, [appendEventDeferred, runtime]);

  const activeScenario = SCENARIO_BY_ID[scenario];

  const jsonRenderCatalog = useMemo<unstable_JsonRenderHostCatalog>(() => {
    if (catalogMode === "override") {
      return {
        Override: JsonCatalogOverrideRenderer,
      };
    }

    if (catalogMode === "fallback-only") {
      return {
        Fallback: JsonCatalogFallbackRenderer,
      };
    }

    return {
      byType: {
        "status-board": StatusBoardRenderer,
        "audit-log": AuditLogRenderer,
        metrics: MetricsRenderer,
      },
      Fallback: JsonCatalogFallbackRenderer,
    };
  }, [catalogMode]);

  const JsonRenderPart: ComponentMessagePartComponent = useCallback(
    (part) => (
      <UnstableJsonRenderHost
        {...part}
        catalog={jsonRenderCatalog}
        onCatalogTelemetry={onCatalogTelemetry}
      />
    ),
    [jsonRenderCatalog, onCatalogTelemetry],
  );

  const assistantMessagePartComponents = useMemo(
    () => ({
      Text: DemoTextPart,
      Component: {
        byName: {
          "status-card": StatusCardPart,
          [unstable_AISDK_JSON_RENDER_COMPONENT_NAME]: JsonRenderPart,
        },
        Fallback: UnknownComponentPart,
      },
    }),
    [JsonRenderPart],
  );

  const sendScenarioPrompt = useCallback(
    async (targetScenario: Scenario, source: "manual" | "matrix") => {
      setScenario(targetScenario);
      await sleep(120);
      runtime.thread.append({
        role: "user",
        content: [
          {
            type: "text",
            text: `Run scenario: ${SCENARIO_BY_ID[targetScenario].title} (${source})`,
          },
        ],
      });
    },
    [runtime],
  );

  const waitForScenarioCompletion = useCallback(
    async (initialAssistantCount: number, timeoutMs = 16000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const state = runtime.thread.getState();
        const assistantCount = state.messages.filter(
          (message) => message.role === "assistant",
        ).length;
        if (assistantCount > initialAssistantCount && !state.isRunning) {
          await sleep(120);
          return true;
        }
        await sleep(120);
      }
      return false;
    },
    [runtime],
  );

  const runScenarioMatrix = useCallback(async () => {
    if (isMatrixRunning) return;

    const previousScenario = scenario;
    const previousInvokeMode = invokeMode;
    const previousEmitEnabled = emitEnabled;

    setIsMatrixRunning(true);
    setMatrixSummary(null);
    setInvokeMode("success");
    setEmitEnabled(true);

    runtime.thread.reset();
    await sleep(120);

    const startingInvokeReceipts = invokeReceipts;
    const startingEmitReceipts = emitReceipts;
    const startingCatalogTelemetry = { ...catalogTelemetry };

    const results: MatrixScenarioResult[] = [];

    for (const scenarioDefinition of SCENARIOS) {
      const beforeTelemetry = telemetryCountersRef.current;
      const beforeAssistantCount = runtime.thread
        .getState()
        .messages.filter((message) => message.role === "assistant").length;

      await sendScenarioPrompt(scenarioDefinition.id, "matrix");
      const completed = await waitForScenarioCompletion(beforeAssistantCount);

      if (!completed) {
        results.push({
          scenario: scenarioDefinition.id,
          pass: false,
          details: "timed out waiting for run completion",
          finalSpecState: "[]",
        });
        continue;
      }

      const state = runtime.thread.getState();
      const latestAssistant = [...state.messages]
        .reverse()
        .find((message) => message.role === "assistant");

      if (!latestAssistant) {
        results.push({
          scenario: scenarioDefinition.id,
          pass: false,
          details: "assistant message missing",
          finalSpecState: "[]",
        });
        continue;
      }

      const parts = normalizeComponentParts(latestAssistant);
      const afterTelemetry = telemetryCountersRef.current;
      const telemetryDelta = {
        staleSeqIgnored:
          afterTelemetry.staleSeqIgnored - beforeTelemetry.staleSeqIgnored,
        malformedPatchDropped:
          afterTelemetry.malformedPatchDropped -
          beforeTelemetry.malformedPatchDropped,
      };

      const evaluation = evaluateScenario(
        scenarioDefinition.id,
        parts,
        telemetryDelta,
      );

      results.push({
        scenario: scenarioDefinition.id,
        pass: evaluation.pass,
        details: `${evaluation.details}; invoke/emit receipts are measured from user interactions during matrix`,
        finalSpecState: formatSpecState(parts),
      });
    }

    const passes = results.filter((result) => result.pass).length;
    const failures = results.length - passes;

    setMatrixSummary({
      runs: results.length,
      passes,
      failures,
      invokeReceipts: invokeReceipts - startingInvokeReceipts,
      emitReceipts: emitReceipts - startingEmitReceipts,
      staleSeqIgnored: telemetryCountersRef.current.staleSeqIgnored,
      malformedPatchDropped: telemetryCountersRef.current.malformedPatchDropped,
      catalogHit:
        catalogTelemetry.catalogHit - startingCatalogTelemetry.catalogHit,
      catalogFallback:
        catalogTelemetry.catalogFallback -
        startingCatalogTelemetry.catalogFallback,
      catalogOverride:
        catalogTelemetry.catalogOverride -
        startingCatalogTelemetry.catalogOverride,
      catalogMiss:
        catalogTelemetry.catalogMiss - startingCatalogTelemetry.catalogMiss,
      results,
    });

    setScenario(previousScenario);
    setInvokeMode(previousInvokeMode);
    setEmitEnabled(previousEmitEnabled);
    setIsMatrixRunning(false);
  }, [
    catalogTelemetry,
    emitEnabled,
    emitReceipts,
    invokeMode,
    invokeReceipts,
    isMatrixRunning,
    scenario,
    sendScenarioPrompt,
    waitForScenarioCompletion,
    runtime,
  ]);

  const saveSnapshot = useCallback(() => {
    const repository = runtime.thread.export();
    const messageCount = runtime.thread.getState().messages.length;
    const payload = {
      savedAt: new Date().toISOString(),
      scenario,
      messageCount,
      repository,
    };
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    setSnapshotMeta({
      savedAt: payload.savedAt,
      messageCount,
    });
    appendEvent(`snapshot saved (${messageCount} messages)`);
  }, [appendEvent, runtime, scenario]);

  const rehydrateSnapshot = useCallback(() => {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      appendEvent("rehydrate failed: no saved snapshot");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        repository?: unknown;
        messageCount?: unknown;
      };
      if (!parsed.repository) {
        appendEvent("rehydrate failed: malformed snapshot payload");
        return;
      }
      runtime.thread.import(parsed.repository as any);
      appendEvent(
        `rehydrated snapshot (${String(parsed.messageCount ?? "?")} messages)`,
      );
    } catch {
      appendEvent("rehydrate failed: snapshot parse error");
    }
  }, [appendEvent, runtime]);

  const reloadWithRehydrate = useCallback(() => {
    saveSnapshot();
    window.sessionStorage.setItem(REHYDRATE_ON_RELOAD_KEY, "1");
    window.location.reload();
  }, [saveSnapshot]);

  const clearSnapshot = useCallback(() => {
    window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    setSnapshotMeta(null);
    appendEvent("snapshot cleared");
  }, [appendEvent]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 bg-muted px-4 py-6 text-foreground">
        <header className="rounded-xl border border-border bg-background p-4">
          <h1 className="font-semibold text-xl">Internal Component Part Lab</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            End-to-end pressure test for component-part substrate plus additive
            json-render lane.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <section className="rounded-lg border border-border bg-muted p-3 text-xs">
              <h2 className="font-semibold text-foreground">
                What this unlocks
              </h2>
              <p className="mt-1 text-muted-foreground">
                Assistant responses become interactive UI graphs, not just text.
                Each component instance is durable and targetable for invoke and
                emit flows across streaming updates.
              </p>
            </section>
            <section className="rounded-lg border border-border bg-muted p-3 text-xs">
              <h2 className="font-semibold text-foreground">
                Component parts + Tool UIs
              </h2>
              <p className="mt-1 text-muted-foreground">
                Use component parts for assistant-authored presentation and
                progressive state updates. Use Tool UIs for explicit tool
                invocation lifecycles. They compose in one thread without
                competing runtime models.
              </p>
            </section>
            <section className="rounded-lg border border-border bg-muted p-3 text-xs">
              <h2 className="font-semibold text-foreground">
                Audience framing
              </h2>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {STORY_AUDIENCE_NOTES.map((item) => (
                  <li key={item.audience}>
                    <span className="font-semibold">{item.audience}:</span>{" "}
                    {item.note}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-3 rounded-lg border border-border bg-muted p-3 text-xs">
            <h2 className="font-semibold text-foreground">
              90-second demo walkthrough
            </h2>
            <ol className="mt-1 space-y-1 text-muted-foreground">
              {STORY_WALKTHROUGH.map((item) => (
                <li key={item.step}>
                  <span className="font-semibold">{item.step}.</span>{" "}
                  <span className="font-semibold">{item.scenario}:</span>{" "}
                  {item.goal}
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-lg border px-3 py-2 text-left text-xs ${
                  scenario === item.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
                onClick={() => setScenario(item.id)}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="mt-1 opacity-80">{item.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 rounded-lg border border-border bg-muted p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Invoke Mode</span>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                value={invokeMode}
                onChange={(event) =>
                  setInvokeMode(event.target.value as InvokeMode)
                }
              >
                <option value="success">success</option>
                <option value="fail">fail</option>
                <option value="timeout">timeout (no ack)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Emit Handler</span>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                value={emitEnabled ? "enabled" : "disabled"}
                onChange={(event) =>
                  setEmitEnabled(event.target.value === "enabled")
                }
              >
                <option value="enabled">enabled</option>
                <option value="disabled">disabled</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Catalog Mode</span>
              <select
                className="rounded border border-border bg-background px-2 py-1"
                value={catalogMode}
                onChange={(event) =>
                  setCatalogMode(event.target.value as CatalogMode)
                }
              >
                <option value="byType">byType + fallback</option>
                <option value="fallback-only">fallback-only</option>
                <option value="override">override</option>
              </select>
            </label>

            <div className="text-xs">
              <div className="font-semibold">Snapshot</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {snapshotMeta
                  ? `saved ${new Date(snapshotMeta.savedAt).toLocaleString()} (${snapshotMeta.messageCount} messages)`
                  : "none"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={() => {
                void sendScenarioPrompt(scenario, "manual");
              }}
              type="button"
            >
              Send Scenario Prompt
            </button>
            <button
              data-testid="run-matrix"
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
              onClick={() => {
                void runScenarioMatrix();
              }}
              type="button"
              disabled={isMatrixRunning}
            >
              {isMatrixRunning ? "Running Matrix..." : "Run Scenario Matrix"}
            </button>
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={() => {
                runtime.thread.reset();
                telemetryCountersRef.current = {
                  staleSeqIgnored: 0,
                  malformedPatchDropped: 0,
                };
                setTelemetry({ ...telemetryCountersRef.current });
                setCatalogTelemetry({
                  catalogHit: 0,
                  catalogFallback: 0,
                  catalogOverride: 0,
                  catalogMiss: 0,
                });
                setInvokeReceipts(0);
                setEmitReceipts(0);
                setEventLog([]);
                setMatrixSummary(null);
              }}
              type="button"
            >
              Reset Thread + Telemetry + Log
            </button>
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={saveSnapshot}
              type="button"
            >
              Save Snapshot
            </button>
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={rehydrateSnapshot}
              type="button"
            >
              Rehydrate Snapshot
            </button>
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={reloadWithRehydrate}
              type="button"
            >
              Reload + Rehydrate
            </button>
            <button
              className="rounded-md border border-border px-2 py-1"
              onClick={clearSnapshot}
              type="button"
            >
              Clear Snapshot
            </button>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-muted px-2 py-1">
              staleSeqIgnored={telemetry.staleSeqIgnored}
            </div>
            <div className="rounded-md border border-border bg-muted px-2 py-1">
              malformedPatchDropped={telemetry.malformedPatchDropped}
            </div>
            <div className="rounded-md border border-border bg-muted px-2 py-1">
              catalog(hit/fallback/override/miss)=
              {catalogTelemetry.catalogHit}/{catalogTelemetry.catalogFallback}/
              {catalogTelemetry.catalogOverride}/{catalogTelemetry.catalogMiss}
            </div>
            <div className="rounded-md border border-border bg-muted px-2 py-1">
              receipts(invoke/emit)={invokeReceipts}/{emitReceipts}
            </div>
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            Active scenario: {activeScenario.title}
          </div>
        </header>

        <div className="h-[65vh] min-h-[60vh] overflow-hidden rounded-xl border border-border bg-background">
          <Thread
            assistantMessagePartComponents={assistantMessagePartComponents}
          />
        </div>

        {matrixSummary ? (
          <section
            className="rounded-xl border border-border bg-background p-4"
            data-testid="matrix-summary"
          >
            <h2 className="font-semibold text-sm">Scenario Matrix Summary</h2>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded bg-muted px-2 py-1">
                runs={matrixSummary.runs} pass={matrixSummary.passes} fail=
                {matrixSummary.failures}
              </div>
              <div className="rounded bg-muted px-2 py-1">
                receipts invoke/emit={matrixSummary.invokeReceipts}/
                {matrixSummary.emitReceipts}
              </div>
              <div className="rounded bg-muted px-2 py-1">
                telemetry stale/malformed={matrixSummary.staleSeqIgnored}/
                {matrixSummary.malformedPatchDropped}
              </div>
              <div className="rounded bg-muted px-2 py-1">
                catalog delta h/f/o/m={matrixSummary.catalogHit}/
                {matrixSummary.catalogFallback}/{matrixSummary.catalogOverride}/
                {matrixSummary.catalogMiss}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {matrixSummary.results.map((result) => (
                <details
                  key={result.scenario}
                  className="rounded border border-border bg-muted p-2"
                  data-testid={`matrix-${result.scenario}`}
                >
                  <summary className="cursor-pointer text-xs">
                    <span className="font-semibold">
                      {SCENARIO_BY_ID[result.scenario].title}
                    </span>{" "}
                    <span
                      className={`ml-2 rounded px-2 py-[2px] ${
                        result.pass
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-rose-100 text-rose-900"
                      }`}
                    >
                      {result.pass ? "PASS" : "FAIL"}
                    </span>
                  </summary>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {result.details}
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px]">
                    {result.finalSpecState}
                  </pre>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-background p-4">
          <h2 className="font-semibold text-sm">Event Log</h2>
          <pre
            className="mt-2 max-h-72 overflow-y-auto rounded bg-muted p-3 text-[11px] leading-5"
            data-testid="event-log"
          >
            {eventLog.length > 0
              ? eventLog.join("\n")
              : "No events yet. Trigger invoke/emit buttons in component cards."}
          </pre>
        </section>
      </div>
    </AssistantRuntimeProvider>
  );
}
