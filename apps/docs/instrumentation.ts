import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PostHogTraceExporter } from "@posthog/ai/otel";
import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";

// Mirrors the prefixes PostHogTraceExporter filters on, so both legs carry the
// same spans. Without it Axiom would also receive every request and fetch span
// that "auto" produces for ordinary site traffic, which it bills by volume.
const AI_SPAN_PREFIXES = ["gen_ai.", "llm.", "ai.", "traceloop."];

export function isAiSpan(span: ReadableSpan) {
  return (
    AI_SPAN_PREFIXES.some((prefix) => span.name.startsWith(prefix)) ||
    Object.keys(span.attributes).some((key) =>
      AI_SPAN_PREFIXES.some((prefix) => key.startsWith(prefix)),
    )
  );
}

export function aiOnly(inner: SpanProcessor): SpanProcessor {
  return {
    onStart: (span, context) => inner.onStart(span, context),
    onEnd: (span) => {
      if (isAiSpan(span)) inner.onEnd(span);
    },
    forceFlush: () => inner.forceFlush(),
    shutdown: () => inner.shutdown(),
  };
}

// PostHog's OTLP ingestion drops span attributes it does not recognise, which
// costs the per-application and per-user dimensions on the AI SDK v7 path
// (PostHog/posthog#52442). Axiom stores every attribute verbatim, so it is
// exported alongside rather than instead of PostHog while both are in use.
export function axiomExporterConfig(env: NodeJS.ProcessEnv) {
  const token = env.AXIOM_TOKEN;
  const dataset = env.AXIOM_DATASET;
  if (!token || !dataset) return null;

  return {
    // api.axiom.co is the US domain; an EU-hosted org ingests at
    // api.eu.axiom.co and otherwise drops batches silently. An empty value
    // has to fall back too: a Vercel variable created ahead of its value
    // would otherwise build https:///v1/traces.
    url: `https://${env.AXIOM_DOMAIN || "api.axiom.co"}/v1/traces`,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Axiom-Dataset": dataset,
    },
  };
}

function axiomProcessor() {
  const config = axiomExporterConfig(process.env);
  if (!config) return null;

  return aiOnly(new BatchSpanProcessor(new OTLPHttpProtoTraceExporter(config)));
}

export function register() {
  const axiom = axiomProcessor();

  registerOTel({
    serviceName: "assistant-ui-docs",
    traceExporter: new PostHogTraceExporter({
      projectToken: process.env.NEXT_PUBLIC_POSTHOG_API_KEY ?? "",
    }),
    // "auto" keeps the environment's default processors, including the Vercel
    // tracing integration that an explicit list would otherwise replace.
    spanProcessors: axiom ? ["auto", axiom] : ["auto"],
  });
}
