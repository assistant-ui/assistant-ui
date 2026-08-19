import { PostHogTraceExporter } from "@posthog/ai/otel";
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "assistant-ui-docs",
    traceExporter: new PostHogTraceExporter({
      projectToken: process.env.NEXT_PUBLIC_POSTHOG_API_KEY ?? "",
    }),
  });
}
