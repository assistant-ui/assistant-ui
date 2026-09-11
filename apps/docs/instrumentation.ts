import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { PostHogTraceExporter } from "@posthog/ai/otel";
import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";
import {
  createAssistantCloudSpanProcessor,
  createAssistantCloudTraceExporter,
} from "assistant-cloud/telemetry";

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

export function assistantCloudExporterConfig(env: NodeJS.ProcessEnv) {
  const apiKey = env.ASSISTANT_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: env.ASSISTANT_BACKEND_URL || undefined,
  };
}

function axiomProcessor() {
  const config = axiomExporterConfig(process.env);
  if (!config) return null;

  return createAssistantCloudSpanProcessor(
    new OTLPHttpProtoTraceExporter(config),
    { filter: isAiSpan },
  );
}

export function register() {
  const axiom = axiomProcessor();
  const assistantCloud = assistantCloudExporterConfig(process.env);

  registerOTel({
    serviceName: "assistant-ui-docs",
    traceExporter: new PostHogTraceExporter({
      projectToken: process.env.NEXT_PUBLIC_POSTHOG_API_KEY ?? "",
    }),
    // "auto" keeps the environment's default processors, including the Vercel
    // tracing integration that an explicit list would otherwise replace.
    spanProcessors: [
      "auto",
      ...(axiom ? [axiom] : []),
      ...(assistantCloud
        ? [
            createAssistantCloudSpanProcessor(
              createAssistantCloudTraceExporter({
                apiKey: assistantCloud.apiKey,
                ...(assistantCloud.baseUrl
                  ? { baseUrl: assistantCloud.baseUrl }
                  : {}),
              }),
              { filter: isAiSpan },
            ),
          ]
        : []),
    ],
  });
}
