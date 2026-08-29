import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { describe, expect, it, vi } from "vitest";
import { aiOnly, axiomExporterConfig, isAiSpan } from "./instrumentation";

function span(name: string, attributes: Record<string, unknown> = {}) {
  return { name, attributes } as unknown as ReadableSpan;
}

function recordingProcessor() {
  return {
    onStart: vi.fn(),
    onEnd: vi.fn(),
    forceFlush: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  } satisfies SpanProcessor;
}

describe("isAiSpan", () => {
  it("accepts a span whose name carries an AI prefix", () => {
    expect(isAiSpan(span("ai.streamText"))).toBe(true);
    expect(isAiSpan(span("gen_ai.client"))).toBe(true);
  });

  it("accepts a span whose attributes carry an AI prefix", () => {
    expect(
      isAiSpan(
        span("chat gpt-5.6-luna", {
          "ai.settings.context.posthog_distinct_id": "user_1",
        }),
      ),
    ).toBe(true);
  });

  it("drops an ordinary request span", () => {
    expect(
      isAiSpan(
        span("GET /docs/[[...slug]]", {
          "http.method": "GET",
          "next.route": "/docs/[[...slug]]",
        }),
      ),
    ).toBe(false);
  });
});

describe("aiOnly", () => {
  it("forwards AI spans and swallows the rest", () => {
    const inner = recordingProcessor();
    const processor = aiOnly(inner);

    processor.onEnd(span("ai.streamText"));
    processor.onEnd(span("GET /docs", { "http.method": "GET" }));

    expect(inner.onEnd).toHaveBeenCalledTimes(1);
    expect(inner.onEnd.mock.calls[0]?.[0].name).toBe("ai.streamText");
  });

  it("passes onStart through unfiltered", () => {
    const inner = recordingProcessor();
    const started = span("GET /docs", { "http.method": "GET" });
    const context = {} as Parameters<SpanProcessor["onStart"]>[1];

    aiOnly(inner).onStart(
      started as unknown as Parameters<SpanProcessor["onStart"]>[0],
      context,
    );

    expect(inner.onStart).toHaveBeenCalledWith(started, context);
  });

  // A wrapper that forgets either one silently loses the tail batch on Vercel,
  // where the function suspends as soon as the response is sent.
  it("delegates forceFlush and shutdown to the inner processor", async () => {
    const inner = recordingProcessor();
    const processor = aiOnly(inner);

    await processor.forceFlush();
    await processor.shutdown();

    expect(inner.forceFlush).toHaveBeenCalledTimes(1);
    expect(inner.shutdown).toHaveBeenCalledTimes(1);
  });
});

describe("axiomExporterConfig", () => {
  const creds = { AXIOM_TOKEN: "xaat-test", AXIOM_DATASET: "traces" };

  it("returns null unless both credentials are present", () => {
    expect(axiomExporterConfig({})).toBeNull();
    expect(axiomExporterConfig({ AXIOM_TOKEN: "xaat-test" })).toBeNull();
    expect(axiomExporterConfig({ AXIOM_DATASET: "traces" })).toBeNull();
  });

  it("defaults to the US host when the domain is unset or blank", () => {
    expect(axiomExporterConfig(creds)?.url).toBe(
      "https://api.axiom.co/v1/traces",
    );
    expect(axiomExporterConfig({ ...creds, AXIOM_DOMAIN: "" })?.url).toBe(
      "https://api.axiom.co/v1/traces",
    );
  });

  it("honours an explicit region", () => {
    expect(
      axiomExporterConfig({ ...creds, AXIOM_DOMAIN: "api.eu.axiom.co" })?.url,
    ).toBe("https://api.eu.axiom.co/v1/traces");
  });

  it("carries the token and dataset headers", () => {
    expect(axiomExporterConfig(creds)?.headers).toEqual({
      Authorization: "Bearer xaat-test",
      "X-Axiom-Dataset": "traces",
    });
  });
});
