import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

const DEFAULT_BACKEND_BASE_URL = "https://backend.assistant-api.com";
const AI_SPAN_PREFIXES = ["gen_ai.", "ai.", "llm."];

export type AssistantCloudTraceExportOptions = {
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
};

export type AssistantCloudSpanProcessorOptions = {
  filter?: (span: ReadableSpan) => boolean;
};

export function assistantCloudTraceExportOptions({
  apiKey,
  baseUrl = DEFAULT_BACKEND_BASE_URL,
  headers,
}: AssistantCloudTraceExportOptions): {
  url: string;
  headers: Record<string, string>;
} {
  if (!apiKey) throw new Error("An Assistant Cloud API key is required");

  return {
    url: `${trimTrailingSlashes(baseUrl)}/v1/traces`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
  };
}

function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end--;
  return url.slice(0, end);
}

export function createAssistantCloudTraceExporter(
  options: AssistantCloudTraceExportOptions,
): SpanExporter {
  return new OTLPTraceExporter(assistantCloudTraceExportOptions(options));
}

export function isAssistantCloudSpan(span: ReadableSpan): boolean {
  return (
    typeof span.attributes["gen_ai.operation.name"] === "string" ||
    AI_SPAN_PREFIXES.some((prefix) => span.name.startsWith(prefix))
  );
}

export function createAssistantCloudSpanProcessor(
  exporter: SpanExporter,
  options: AssistantCloudSpanProcessorOptions = {},
): SpanProcessor {
  const processor = new BatchSpanProcessor(exporter);
  const filter = options.filter ?? isAssistantCloudSpan;

  return {
    onStart: (span, parentContext) => processor.onStart(span, parentContext),
    onEnd: (span) => {
      if (filter(span)) processor.onEnd(span);
    },
    forceFlush: () => processor.forceFlush(),
    shutdown: () => processor.shutdown(),
  };
}

export function assistantCloudTraceMetadata(): { traceId?: string } {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext && trace.isSpanContextValid(spanContext)
    ? { traceId: spanContext.traceId }
    : {};
}

export function withAssistantCloudTraceMetadata<
  Part extends { type: string } = { type: string },
>(
  messageMetadata?: (options: {
    part: Part;
  }) => Record<string, unknown> | undefined,
): (options: { part: Part }) => Record<string, unknown> | undefined {
  return (options) => {
    const metadata = messageMetadata?.(options);
    if (options.part.type !== "start") return metadata;
    const trace = assistantCloudTraceMetadata();
    return trace.traceId === undefined ? metadata : { ...metadata, ...trace };
  };
}
