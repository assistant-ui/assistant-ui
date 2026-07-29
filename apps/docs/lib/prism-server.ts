import { AuixPrism, prismAISDK as prismAISDKBase } from "@aui-x/prism";
import type { TraceEvent } from "@aui-x/prism";

const apiKey = process.env.AUIX_PRISM_API_KEY;

type PrismTracerOptions = {
  evalRunId?: string | null;
  localTraceUrl?: string | null;
};

function getLocalTraceUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1"].includes(hostname)
    ) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

async function postLocalTraceEvents(
  localTraceUrl: string,
  evalRunId: string | null | undefined,
  events: TraceEvent[],
) {
  await fetch(localTraceUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      source: "aui-x-prism",
      evalRunId: evalRunId ?? null,
      events,
    }),
  });
}

export function createPrismTracer(
  options: PrismTracerOptions = {},
): AuixPrism | null {
  const localTraceUrl =
    process.env.XULUX_EVAL_MODE === "1"
      ? getLocalTraceUrl(options.localTraceUrl)
      : null;
  if (!apiKey && !localTraceUrl) return null;

  return new AuixPrism({
    apiKey: apiKey ?? "local-agent-eval",
    project: "assistant-ui-docs",
    ...(localTraceUrl
      ? {
          transport: (events: TraceEvent[]) =>
            postLocalTraceEvents(localTraceUrl, options.evalRunId, events),
        }
      : {}),
  });
}

// @aui-x/prism types prismAISDK against @ai-sdk/provider v3 (LanguageModelV3),
// while AI SDK v7 models are LanguageModelV4; the wrapper is transparent at
// runtime, so the provider-version gap is bridged here, preserving the caller's
// model type through the returned `model`.
export function prismAISDK<TModel>(
  tracer: Parameters<typeof prismAISDKBase>[0],
  model: TModel,
  opts?: Parameters<typeof prismAISDKBase>[2],
): Omit<ReturnType<typeof prismAISDKBase>, "model"> & { model: TModel } {
  return prismAISDKBase(tracer, model as never, opts) as Omit<
    ReturnType<typeof prismAISDKBase>,
    "model"
  > & { model: TModel };
}
