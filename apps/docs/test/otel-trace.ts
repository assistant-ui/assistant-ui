import { AsyncLocalStorage } from "node:async_hooks";
import {
  ROOT_CONTEXT,
  TraceFlags,
  context,
  trace,
  type Context,
  type ContextManager,
} from "@opentelemetry/api";
import { MockLanguageModelV4, convertArrayToReadableStream } from "ai/test";

class AsyncLocalStorageContextManager implements ContextManager {
  private readonly storage = new AsyncLocalStorage<Context>();

  active(): Context {
    return this.storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    nextContext: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this.storage.run(nextContext, () => fn.call(thisArg, ...args));
  }

  bind<T>(_context: Context, target: T): T {
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this.storage.disable();
    return this;
  }
}

/**
 * Runs `fn` under an active span context the way the instrumented request
 * handler does in production, so routes can read the request's trace id.
 */
export function withActiveTrace<T>(traceId: string, fn: () => T): T {
  context.disable();
  context.setGlobalContextManager(new AsyncLocalStorageContextManager());
  const active = trace.setSpanContext(ROOT_CONTEXT, {
    traceId,
    spanId: "0123456789abcdef",
    traceFlags: TraceFlags.SAMPLED,
  });
  return context.with(active, fn);
}

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer Part>
    ? Part
    : never;

export function textModel(text: string) {
  const parts: StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: {
          total: 3,
          noCache: 3,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 2, text: 2, reasoning: undefined },
      },
    },
  ];
  return new MockLanguageModelV4({
    modelId: "mock-model",
    doStream: { stream: convertArrayToReadableStream(parts) },
  });
}

export async function readMessageMetadata(response: Response) {
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice("data: ".length)))
    .filter(
      (chunk) =>
        chunk.type === "start" ||
        chunk.type === "message-metadata" ||
        chunk.type === "finish",
    )
    .flatMap((chunk) => (chunk.messageMetadata ? [chunk.messageMetadata] : []));
}
