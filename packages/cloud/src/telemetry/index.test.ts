import {
  ROOT_CONTEXT,
  context,
  trace,
  type Context,
  type ContextManager,
} from "@opentelemetry/api";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  assistantCloudTraceExportOptions,
  assistantCloudTraceMetadata,
  createAssistantCloudSpanProcessor,
  isAssistantCloudSpan,
  withAssistantCloudTraceMetadata,
} from "./index";

const TRACE_ID = "0123456789abcdef0123456789abcdef";
const SPAN_ID = "0123456789abcdef";

class TestContextManager implements ContextManager {
  private activeContext: Context = ROOT_CONTEXT;

  active(): Context {
    return this.activeContext;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    nextContext: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const previousContext = this.activeContext;
    this.activeContext = nextContext;
    try {
      return fn.call(thisArg, ...args);
    } finally {
      this.activeContext = previousContext;
    }
  }

  bind<T>(_context: Context, target: T): T {
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this.activeContext = ROOT_CONTEXT;
    return this;
  }
}

function span(
  name: string,
  attributes: Record<string, unknown> = {},
): ReadableSpan {
  return {
    name,
    attributes,
    spanContext: () => ({
      traceId: TRACE_ID,
      spanId: SPAN_ID,
      traceFlags: 1,
    }),
    resource: { asyncAttributesPending: false },
  } as ReadableSpan;
}

function recordingExporter() {
  const spans: ReadableSpan[] = [];
  const exporter = {
    export: vi.fn(
      (
        nextSpans: ReadableSpan[],
        resultCallback: Parameters<SpanExporter["export"]>[1],
      ) => {
        spans.push(...nextSpans);
        resultCallback({ code: 0 });
      },
    ),
    shutdown: vi.fn().mockResolvedValue(undefined),
  } satisfies SpanExporter;

  return { exporter, spans };
}

beforeAll(() => {
  context.disable();
  context.setGlobalContextManager(new TestContextManager());
});

afterAll(() => {
  context.disable();
});

describe("assistantCloudTraceExportOptions", () => {
  it("uses the default receiver and authorization header", () => {
    expect(assistantCloudTraceExportOptions({ apiKey: "key" })).toEqual({
      url: "https://backend.assistant-api.com/v1/traces",
      headers: { Authorization: "Bearer key" },
    });
  });

  it("uses a custom receiver without a trailing slash", () => {
    expect(
      assistantCloudTraceExportOptions({
        apiKey: "key",
        baseUrl: "https://cloud.example.com",
      }),
    ).toEqual({
      url: "https://cloud.example.com/v1/traces",
      headers: { Authorization: "Bearer key" },
    });
  });

  it("removes trailing slashes and preserves extra headers", () => {
    expect(
      assistantCloudTraceExportOptions({
        apiKey: "key",
        baseUrl: "https://cloud.example.com/",
        headers: { "X-Workspace": "workspace_1" },
      }),
    ).toEqual({
      url: "https://cloud.example.com/v1/traces",
      headers: {
        Authorization: "Bearer key",
        "X-Workspace": "workspace_1",
      },
    });
  });

  it("rejects an empty API key", () => {
    expect(() => assistantCloudTraceExportOptions({ apiKey: "" })).toThrow(
      "An Assistant Cloud API key is required",
    );
  });
});

describe("isAssistantCloudSpan", () => {
  it("accepts AI span name prefixes", () => {
    expect(isAssistantCloudSpan(span("gen_ai.client"))).toBe(true);
    expect(isAssistantCloudSpan(span("ai.streamText"))).toBe(true);
    expect(isAssistantCloudSpan(span("llm.generate"))).toBe(true);
  });

  it("accepts the GenAI operation attribute", () => {
    expect(
      isAssistantCloudSpan(
        span("generate", { "gen_ai.operation.name": "ai.generateText" }),
      ),
    ).toBe(true);
  });

  it("rejects ordinary spans", () => {
    expect(isAssistantCloudSpan(span("GET /api/chat"))).toBe(false);
  });
});

describe("createAssistantCloudSpanProcessor", () => {
  it("exports matching spans and drops other spans", async () => {
    const { exporter, spans } = recordingExporter();
    const processor = createAssistantCloudSpanProcessor(exporter);

    processor.onEnd(span("gen_ai.client"));
    processor.onEnd(span("GET /api/chat"));
    await processor.forceFlush();

    expect(spans.map((candidate) => candidate.name)).toEqual(["gen_ai.client"]);
  });

  it("uses a custom filter when one is provided", async () => {
    const { exporter, spans } = recordingExporter();
    const processor = createAssistantCloudSpanProcessor(exporter, {
      filter: (candidate) => candidate.name === "custom",
    });

    processor.onEnd(span("gen_ai.client"));
    processor.onEnd(span("custom"));
    await processor.forceFlush();

    expect(spans.map((candidate) => candidate.name)).toEqual(["custom"]);
  });

  it("flushes and shuts down the wrapped processor", async () => {
    const { exporter } = recordingExporter();
    const processor = createAssistantCloudSpanProcessor(exporter);

    await processor.forceFlush();
    await processor.shutdown();

    expect(exporter.shutdown).toHaveBeenCalledTimes(1);
  });
});

describe("assistantCloudTraceMetadata", () => {
  it("returns the active trace ID", () => {
    const result = context.with(
      trace.setSpanContext(context.active(), {
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        traceFlags: 1,
      }),
      assistantCloudTraceMetadata,
    );

    expect(result).toEqual({ traceId: TRACE_ID });
  });

  it("returns an empty object without an active span", () => {
    expect(assistantCloudTraceMetadata()).toEqual({});
  });
});

describe("withAssistantCloudTraceMetadata", () => {
  it("merges the active trace ID into start metadata", () => {
    const messageMetadata = withAssistantCloudTraceMetadata(({ part }) => ({
      type: part.type,
    }));

    const result = context.with(
      trace.setSpanContext(context.active(), {
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        traceFlags: 1,
      }),
      () => messageMetadata({ part: { type: "start" } }),
    );

    expect(result).toEqual({ type: "start", traceId: TRACE_ID });
  });

  it("passes through start metadata when no span is active", () => {
    const value = { started: true };
    const messageMetadata = withAssistantCloudTraceMetadata(() => value);

    expect(messageMetadata({ part: { type: "start" } })).toBe(value);
    expect(withAssistantCloudTraceMetadata()({ part: { type: "start" } })).toBe(
      undefined,
    );
  });

  it("passes through metadata for other parts", () => {
    const value = { usage: { totalTokens: 42 } };
    const messageMetadata = withAssistantCloudTraceMetadata(() => value);

    expect(messageMetadata({ part: { type: "finish" } })).toBe(value);
  });
});
