"use client";

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  type ComponentMessagePartComponent,
  type TextMessagePartComponent,
} from "@assistant-ui/react";
import {
  AISDK_JSON_RENDER_COMPONENT_NAME,
  AssistantChatTransport,
  JsonRenderHost,
  createAISDKDataSpecTelemetrySink,
  type AISDKRuntimeAdapter,
  type JsonRenderHostCatalog,
  type JsonRenderHostCatalogRenderer,
  type JsonRenderHostCatalogTelemetryEvent,
} from "@assistant-ui/react-ai-sdk";
import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

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
type CatalogMode = "by_type" | "fallback-only" | "override";

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
    matrixInvokeTarget: "component_demo_1",
  },
  {
    id: "json-render-patch",
    title: "json-render Patch",
    description: "Validates seq ordering and JSON patch application.",
    matrixInvokeTarget: "spec_demo_1",
  },
  {
    id: "json-render-guards",
    title: "json-render Guards",
    description: "Validates stale seq + malformed patch guardrails.",
    matrixInvokeTarget: "spec_demo_2",
  },
  {
    id: "mixed",
    title: "Mixed",
    description: "Runs both native component and json-render in one response.",
    matrixInvokeTarget: "spec_demo_3",
  },
  {
    id: "chaos",
    title: "Chaos",
    description:
      "Interleaved multi-instance updates with duplicate/out-of-order seq.",
    matrixInvokeTarget: "spec_chaos_a",
  },
  {
    id: "json-patch-semantics",
    title: "Patch Semantics",
    description:
      "Covers add/replace/remove, array -, root replace, escaped keys.",
    matrixInvokeTarget: "spec_patch_semantics",
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
    matrixInvokeTarget: "graph_child",
  },
];

const SCENARIO_BY_ID = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
) as Record<Scenario, ScenarioDefinition>;

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
  source: string,
  timeoutMs = 1600,
) => {
  return Promise.race([
    invoke("refresh", { source }),
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
      const result = await invokeWithTimeout(component.invoke, "status-card");
      setInvokeResult(JSON.stringify(result));
    } catch (error) {
      setInvokeError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">
          {cardProps.title ?? "Status Card"}
        </div>
        <div className="rounded-full border border-slate-400 px-2 py-[2px] text-[10px] uppercase">
          native component
        </div>
      </div>
      <div className="mt-1 text-slate-700 text-xs">
        status: {cardProps.status ?? "unknown"}
      </div>
      <div className="mt-1 text-[11px] text-slate-600">
        instance={instanceId ?? "missing"} parent={parentId ?? "none"}
      </div>
      {cardProps.details ? (
        <div className="mt-1 text-slate-600 text-xs">{cardProps.details}</div>
      ) : null}
      {Array.isArray(cardProps.checkList) ? (
        <ul className="mt-2 list-disc pl-4 text-slate-700 text-xs">
          {cardProps.checkList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          onClick={runInvoke}
          type="button"
        >
          invoke(refresh)
        </button>
        <button
          className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
          onClick={() => component?.emit("selected", { source: "status-card" })}
          type="button"
          disabled={!component}
        >
          emit(selected)
        </button>
      </div>
      {invokeResult ? (
        <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
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

const JsonRenderActions: FC<{
  source: string;
  invoke: (action: string, payload?: unknown) => Promise<unknown>;
  emit: (event: string, payload?: unknown) => void;
}> = ({ source, invoke, emit }) => {
  const [invokeResult, setInvokeResult] = useState<string>("");
  const [invokeError, setInvokeError] = useState<string>("");

  return (
    <>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-md border border-slate-400 px-2 py-1 text-xs"
          onClick={async () => {
            setInvokeError("");
            try {
              const result = await invokeWithTimeout(invoke, source);
              setInvokeResult(JSON.stringify(result));
            } catch (error) {
              setInvokeError(
                error instanceof Error ? error.message : "Unknown error",
              );
            }
          }}
          type="button"
        >
          invoke(refresh)
        </button>
        <button
          className="rounded-md border border-slate-400 px-2 py-1 text-xs"
          onClick={() => emit("selected", { source })}
          type="button"
        >
          emit(selected)
        </button>
      </div>
      {invokeResult ? (
        <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
          {invokeResult}
        </pre>
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
        className="rounded-full border border-slate-400 px-2 py-[2px] uppercase"
        data-testid="catalog-path-badge"
      >
        {badge}
      </span>
      <span className="text-slate-700">type={specType ?? "unknown"}</span>
      <span className="text-slate-700">instance={instanceId ?? "missing"}</span>
      <span className="text-slate-700">parent={parentId ?? "none"}</span>
    </div>
  );
};

const StatusBoardRenderer: JsonRenderHostCatalogRenderer = ({
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

  return (
    <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
      <div className="font-semibold text-sm">{title}</div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      <div className="mt-1 text-emerald-900 text-xs">state: {state}</div>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 text-emerald-900 text-xs">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <JsonRenderActions
        source={specType ?? "status-board"}
        invoke={invoke}
        emit={emit}
      />
    </div>
  );
};

const AuditLogRenderer: JsonRenderHostCatalogRenderer = ({
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
    <div className="mt-2 rounded-xl border border-cyan-300 bg-cyan-50 p-3">
      <div className="font-semibold text-sm">{title}</div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      <div className="mt-1 text-cyan-900 text-xs">status: {status}</div>
      {entries.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 text-cyan-900 text-xs">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      ) : null}
      <JsonRenderActions
        source={specType ?? "audit-log"}
        invoke={invoke}
        emit={emit}
      />
    </div>
  );
};

const MetricsRenderer: JsonRenderHostCatalogRenderer = ({
  spec,
  specType,
  instanceId,
  invoke,
  emit,
}) => {
  const props = getSpecProps(spec);
  const title = typeof props.title === "string" ? props.title : "Metrics";
  const metrics = getNumberRecord(props.values);

  return (
    <div className="mt-2 rounded-xl border border-violet-300 bg-violet-50 p-3">
      <div className="font-semibold text-sm">{title}</div>
      <JsonRendererMeta
        badge="catalog-hit"
        specType={specType}
        instanceId={instanceId}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="rounded bg-white px-2 py-1 text-violet-900">
            <span className="font-semibold">{key}:</span> {value}
          </div>
        ))}
      </div>
      <JsonRenderActions
        source={specType ?? "metrics"}
        invoke={invoke}
        emit={emit}
      />
    </div>
  );
};

const JsonCatalogFallbackRenderer: JsonRenderHostCatalogRenderer = ({
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
      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
        {JSON.stringify(spec, null, 2)}
      </pre>
      <JsonRenderActions
        source={`fallback:${specType ?? "unknown"}`}
        invoke={invoke}
        emit={emit}
      />
    </div>
  );
};

const JsonCatalogOverrideRenderer: JsonRenderHostCatalogRenderer = ({
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
      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
        {JSON.stringify(spec, null, 2)}
      </pre>
      <JsonRenderActions
        source={`override:${specType ?? "unknown"}`}
        invoke={invoke}
        emit={emit}
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
      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
        {JSON.stringify(props ?? {}, null, 2)}
      </pre>
    </div>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto my-3 w-full max-w-4xl rounded-xl border border-slate-200 bg-slate-100 p-3">
      <MessagePrimitive.Parts components={{ Text: DemoTextPart }} />
    </MessagePrimitive.Root>
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
        part.name === AISDK_JSON_RENDER_COMPONENT_NAME && part.instanceId,
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
        part.name === "status-card" && part.instanceId === "component_demo_1",
    );
    const hasFallback = parts.some((part) => part.name === "unknown-demo");
    return {
      pass: hasStatusCard && hasFallback,
      details: `status-card=${hasStatusCard} fallback=${hasFallback}`,
    };
  }

  if (scenario === "json-render-patch") {
    const spec = byInstance.get("spec_demo_1")?.specProps;
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
    const spec = byInstance.get("spec_demo_2")?.specProps;
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
    const metrics = byInstance.get("spec_demo_3");
    const fallback = byInstance.get("spec_demo_fallback");
    const pass =
      metrics?.specType === "metrics" &&
      fallback?.specType === "unknown-widget";
    return {
      pass,
      details: `metricsType=${metrics?.specType ?? "none"} fallbackType=${fallback?.specType ?? "none"}`,
    };
  }

  if (scenario === "chaos") {
    const specA = byInstance.get("spec_chaos_a")?.specProps;
    const specB = byInstance.get("spec_chaos_b")?.specProps;
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
    const spec = byInstance.get("spec_patch_semantics")?.specProps;
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
        part.name === AISDK_JSON_RENDER_COMPONENT_NAME && !part.instanceId,
    );
    return {
      pass: missingStatusCard && missingJsonRender,
      details: `nativeMissing=${missingStatusCard} jsonMissing=${missingJsonRender}`,
    };
  }

  const parent = byInstance.get("graph_parent");
  const child = byInstance.get("graph_child");
  const graphSpec = byInstance.get("graph_spec");
  const nestedSpec = byInstance.get("graph_spec_child");
  const pass =
    !parent?.parentId &&
    child?.parentId === "graph_parent" &&
    graphSpec?.parentId === "graph_child" &&
    nestedSpec?.parentId === "graph_spec";
  return {
    pass,
    details: `childParent=${child?.parentId ?? "none"} graphSpecParent=${graphSpec?.parentId ?? "none"} nestedParent=${nestedSpec?.parentId ?? "none"}`,
  };
};

export default function ComponentPartLabPage() {
  const [scenario, setScenario] = useState<Scenario>("component-part");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({
    staleSeqIgnored: 0,
    malformedPatchDropped: 0,
  });
  const [catalogTelemetry, setCatalogTelemetry] = useState({
    catalogHit: 0,
    catalogFallback: 0,
    catalogOverride: 0,
    catalogMiss: 0,
  });
  const [invokeMode, setInvokeMode] = useState<InvokeMode>("success");
  const [emitEnabled, setEmitEnabled] = useState(true);
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("by_type");
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

  const telemetrySink = useMemo(
    () =>
      createAISDKDataSpecTelemetrySink({
        onEvent: (event, counters) => {
          queueMicrotask(() => setTelemetry(counters));
          appendEventDeferred(
            `telemetry ${event.type} instance=${event.instanceId} ${"seq" in event ? `seq=${event.seq}` : ""}`,
          );
        },
      }),
    [appendEventDeferred],
  );

  const onCatalogTelemetry = useCallback(
    (event: JsonRenderHostCatalogTelemetryEvent) => {
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

  const dataSpec = useMemo(
    () => ({
      onTelemetry: telemetrySink.onTelemetry,
    }),
    [telemetrySink],
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
    dataSpec,
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

  const jsonRenderCatalog = useMemo<JsonRenderHostCatalog>(() => {
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
      by_type: {
        "status-board": StatusBoardRenderer,
        "audit-log": AuditLogRenderer,
        metrics: MetricsRenderer,
      },
      Fallback: JsonCatalogFallbackRenderer,
    };
  }, [catalogMode]);

  const JsonRenderPart: ComponentMessagePartComponent = useCallback(
    (part) => (
      <JsonRenderHost
        {...part}
        catalog={jsonRenderCatalog}
        onCatalogTelemetry={onCatalogTelemetry}
      />
    ),
    [jsonRenderCatalog, onCatalogTelemetry],
  );

  const AssistantMessage: FC = useCallback(() => {
    return (
      <MessagePrimitive.Root className="mx-auto my-3 w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-3">
        <MessagePrimitive.Parts
          components={{
            Text: DemoTextPart,
            Component: {
              by_name: {
                "status-card": StatusCardPart,
                [AISDK_JSON_RENDER_COMPONENT_NAME]: JsonRenderPart,
              },
              Fallback: UnknownComponentPart,
            },
          }}
        />
      </MessagePrimitive.Root>
    );
  }, [JsonRenderPart]);

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
      const beforeTelemetry = telemetrySink.getCounters();
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
      const afterTelemetry = telemetrySink.getCounters();
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
      staleSeqIgnored: telemetrySink.getCounters().staleSeqIgnored,
      malformedPatchDropped: telemetrySink.getCounters().malformedPatchDropped,
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
    telemetrySink,
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
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4">
          <h1 className="font-semibold text-xl">Internal Component Part Lab</h1>
          <p className="mt-1 text-slate-600 text-sm">
            End-to-end pressure test for component-part substrate plus additive
            json-render lane.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-lg border px-3 py-2 text-left text-xs ${
                  scenario === item.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800"
                }`}
                onClick={() => setScenario(item.id)}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="mt-1 opacity-80">{item.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">Invoke Mode</span>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
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
                className="rounded border border-slate-300 bg-white px-2 py-1"
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
                className="rounded border border-slate-300 bg-white px-2 py-1"
                value={catalogMode}
                onChange={(event) =>
                  setCatalogMode(event.target.value as CatalogMode)
                }
              >
                <option value="by_type">by_type + fallback</option>
                <option value="fallback-only">fallback-only</option>
                <option value="override">override</option>
              </select>
            </label>

            <div className="text-xs">
              <div className="font-semibold">Snapshot</div>
              <div className="mt-1 text-[11px] text-slate-600">
                {snapshotMeta
                  ? `saved ${new Date(snapshotMeta.savedAt).toLocaleString()} (${snapshotMeta.messageCount} messages)`
                  : "none"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={() => {
                void sendScenarioPrompt(scenario, "manual");
              }}
              type="button"
            >
              Send Scenario Prompt
            </button>
            <button
              data-testid="run-matrix"
              className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
              onClick={() => {
                void runScenarioMatrix();
              }}
              type="button"
              disabled={isMatrixRunning}
            >
              {isMatrixRunning ? "Running Matrix..." : "Run Scenario Matrix"}
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={() => {
                runtime.thread.reset();
                telemetrySink.reset();
                setTelemetry(telemetrySink.getCounters());
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
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={saveSnapshot}
              type="button"
            >
              Save Snapshot
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={rehydrateSnapshot}
              type="button"
            >
              Rehydrate Snapshot
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={reloadWithRehydrate}
              type="button"
            >
              Reload + Rehydrate
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={clearSnapshot}
              type="button"
            >
              Clear Snapshot
            </button>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              staleSeqIgnored={telemetry.staleSeqIgnored}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              malformedPatchDropped={telemetry.malformedPatchDropped}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              catalog(hit/fallback/override/miss)=
              {catalogTelemetry.catalogHit}/{catalogTelemetry.catalogFallback}/
              {catalogTelemetry.catalogOverride}/{catalogTelemetry.catalogMiss}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              receipts(invoke/emit)={invokeReceipts}/{emitReceipts}
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-600">
            Active scenario: {activeScenario.title}
          </div>
        </header>

        <ThreadPrimitive.Root className="flex min-h-[60vh] flex-col rounded-xl border border-slate-200 bg-slate-50">
          <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-3">
            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root className="border-slate-200 border-t bg-white p-3">
            <ComposerPrimitive.Input
              className="w-full resize-none rounded-md border border-slate-300 p-2 text-sm"
              rows={2}
              placeholder="Type a message, or use 'Send Scenario Prompt' above."
            />
            <div className="mt-2 flex justify-end gap-2">
              <ComposerPrimitive.Cancel asChild>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  type="button"
                >
                  Stop
                </button>
              </ComposerPrimitive.Cancel>
              <ComposerPrimitive.Send asChild>
                <button
                  className="rounded-md bg-slate-900 px-3 py-1 text-white text-xs"
                  type="submit"
                >
                  Send
                </button>
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>

        {matrixSummary ? (
          <section
            className="rounded-xl border border-slate-200 bg-white p-4"
            data-testid="matrix-summary"
          >
            <h2 className="font-semibold text-sm">Scenario Matrix Summary</h2>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded bg-slate-50 px-2 py-1">
                runs={matrixSummary.runs} pass={matrixSummary.passes} fail=
                {matrixSummary.failures}
              </div>
              <div className="rounded bg-slate-50 px-2 py-1">
                receipts invoke/emit={matrixSummary.invokeReceipts}/
                {matrixSummary.emitReceipts}
              </div>
              <div className="rounded bg-slate-50 px-2 py-1">
                telemetry stale/malformed={matrixSummary.staleSeqIgnored}/
                {matrixSummary.malformedPatchDropped}
              </div>
              <div className="rounded bg-slate-50 px-2 py-1">
                catalog delta h/f/o/m={matrixSummary.catalogHit}/
                {matrixSummary.catalogFallback}/{matrixSummary.catalogOverride}/
                {matrixSummary.catalogMiss}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {matrixSummary.results.map((result) => (
                <details
                  key={result.scenario}
                  className="rounded border border-slate-200 bg-slate-50 p-2"
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
                  <div className="mt-2 text-[11px] text-slate-700">
                    {result.details}
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
                    {result.finalSpecState}
                  </pre>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-sm">Event Log</h2>
          <pre
            className="mt-2 max-h-72 overflow-y-auto rounded bg-slate-50 p-3 text-[11px] leading-5"
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
