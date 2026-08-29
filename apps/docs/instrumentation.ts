import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PostHogTraceExporter } from "@posthog/ai/otel";
import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";

// PostHog's OTLP ingestion drops span attributes it does not recognise, which
// costs the per-application and per-user dimensions on the AI SDK v7 path
// (PostHog/posthog#52442). Axiom stores every attribute verbatim, so it is
// exported alongside rather than instead of PostHog while both are in use.
function axiomProcessor() {
  const token = process.env.AXIOM_TOKEN;
  const dataset = process.env.AXIOM_DATASET;
  if (!token || !dataset) return null;

  return new BatchSpanProcessor(
    new OTLPHttpProtoTraceExporter({
      url: "https://api.axiom.co/v1/traces",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Axiom-Dataset": dataset,
      },
    }),
  );
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
