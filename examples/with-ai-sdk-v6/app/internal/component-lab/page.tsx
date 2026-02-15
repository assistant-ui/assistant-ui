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
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useCallback, useMemo, useState, type FC } from "react";

type Scenario =
  | "component-part"
  | "json-render-patch"
  | "json-render-guards"
  | "mixed";

const SCENARIOS: { id: Scenario; title: string; description: string }[] = [
  {
    id: "component-part",
    title: "Component Part",
    description: "Validates data-component -> component rendering + fallback.",
  },
  {
    id: "json-render-patch",
    title: "json-render Patch",
    description: "Validates seq ordering and JSON patch application.",
  },
  {
    id: "json-render-guards",
    title: "json-render Guards",
    description: "Validates stale seq + malformed patch guardrails.",
  },
  {
    id: "mixed",
    title: "Mixed",
    description: "Runs both native component and json-render in one response.",
  },
];

const DemoTextPart: TextMessagePartComponent = ({ text }) => {
  return <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>;
};

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

const StatusCardPart: ComponentMessagePartComponent = ({
  instanceId,
  props,
}) => {
  const aui = useAui();
  const component = instanceId
    ? aui.message().component({ instanceId })
    : undefined;
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
      const result = await component.invoke("refresh", {
        source: "status-card",
      });
      setInvokeResult(JSON.stringify(result));
    } catch (error) {
      setInvokeError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="font-semibold text-sm">
        {cardProps.title ?? "Status Card"}
      </div>
      <div className="mt-1 text-slate-700 text-xs">
        status: {cardProps.status ?? "unknown"}
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
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
              const result = await invoke("refresh", { source });
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
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-emerald-900">
          {specType}:{instanceId ?? "no-instance"}
        </div>
      </div>
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
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-cyan-900">
          {specType}:{instanceId ?? "no-instance"}
        </div>
      </div>
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
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-violet-900">
          {specType}:{instanceId ?? "no-instance"}
        </div>
      </div>
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
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <div className="font-semibold text-sm">
        json-render fallback: {specType ?? "unknown"}
      </div>
      <div className="mt-1 text-[11px] text-amber-900">
        instance: {instanceId ?? "no-instance"}
      </div>
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

const JSON_RENDER_CATALOG: JsonRenderHostCatalog = {
  by_type: {
    "status-board": StatusBoardRenderer,
    "audit-log": AuditLogRenderer,
    metrics: MetricsRenderer,
  },
  Fallback: JsonCatalogFallbackRenderer,
};

const JsonRenderPart: ComponentMessagePartComponent = (part) => {
  return <JsonRenderHost {...part} catalog={JSON_RENDER_CATALOG} />;
};

const UnknownComponentPart: ComponentMessagePartComponent = ({
  name,
  props,
}) => {
  return (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
      <div className="font-semibold">Fallback component renderer: {name}</div>
      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px]">
        {JSON.stringify(props ?? {}, null, 2)}
      </pre>
    </div>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto my-3 w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-3">
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
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto my-3 w-full max-w-3xl rounded-xl border border-slate-200 bg-slate-100 p-3">
      <MessagePrimitive.Parts components={{ Text: DemoTextPart }} />
    </MessagePrimitive.Root>
  );
};

export default function ComponentPartLabPage() {
  const [scenario, setScenario] = useState<Scenario>("component-part");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({
    staleSeqIgnored: 0,
    malformedPatchDropped: 0,
  });

  const appendEvent = useCallback((line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [`[${timestamp}] ${line}`, ...prev].slice(0, 40));
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

  const onComponentInvoke = useCallback(
    async ({
      messageId,
      instanceId,
      action,
      payload,
    }: Parameters<
      NonNullable<AISDKRuntimeAdapter["onComponentInvoke"]>
    >[0]) => {
      appendEventDeferred(
        `invoke action=${action} message=${messageId} instance=${instanceId}`,
      );
      if (action === "fail") {
        throw new Error("Simulated invoke error");
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
    [appendEventDeferred],
  );

  const onComponentEmit = useCallback(
    ({
      messageId,
      instanceId,
      event,
      payload,
    }: Parameters<NonNullable<AISDKRuntimeAdapter["onComponentEmit"]>>[0]) => {
      appendEventDeferred(
        `emit event=${event} message=${messageId} instance=${instanceId} payload=${JSON.stringify(payload)}`,
      );
    },
    [appendEventDeferred],
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

  const activeScenario = SCENARIOS.find((item) => item.id === scenario)!;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6">
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
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={() => {
                runtime.thread.append({
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Run scenario: ${activeScenario.title}`,
                    },
                  ],
                });
              }}
              type="button"
            >
              Send Scenario Prompt
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              onClick={() => {
                telemetrySink.reset();
                setTelemetry(telemetrySink.getCounters());
                setEventLog([]);
              }}
              type="button"
            >
              Reset Telemetry + Log
            </button>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              staleSeqIgnored={telemetry.staleSeqIgnored}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              malformedPatchDropped={telemetry.malformedPatchDropped}
            </div>
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

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-sm">Event Log</h2>
          <pre className="mt-2 max-h-64 overflow-y-auto rounded bg-slate-50 p-3 text-[11px] leading-5">
            {eventLog.length > 0
              ? eventLog.join("\n")
              : "No events yet. Trigger invoke/emit buttons in component cards."}
          </pre>
        </section>
      </div>
    </AssistantRuntimeProvider>
  );
}
