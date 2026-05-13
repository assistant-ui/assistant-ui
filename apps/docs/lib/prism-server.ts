import { AuixPrism } from "@aui-x/prism";
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
