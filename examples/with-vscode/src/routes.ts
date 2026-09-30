import type { RouteHandler, WebviewRoutes } from "@assistant-ui/vscode/host";
import { POST as chat } from "./fixtures/route";
import { POST as model } from "./fixtures/model-route";
import { readFixtureRequest } from "./fixtures/request";
import {
  CHAT_ROUTE,
  MODEL_ROUTE,
  SERVED_REQUESTS_ROUTE,
  type ServedRequest,
} from "./protocol";

const MAX_SERVED = 100;

/**
 * Records every request a fixture route serves, so probes can check that a
 * reply came through the bridge and that aborting it fired `req.signal`.
 */
class ServedRequestLog {
  private readonly entries: ServedRequest[] = [];
  private seq = 0;

  list(): readonly ServedRequest[] {
    return this.entries;
  }

  record(path: string, handler: RouteHandler): RouteHandler {
    return async (req) => {
      const { prompt, toolResults } = readFixtureRequest(
        await req
          .clone()
          .json()
          .catch(() => undefined),
      );
      const entry: ServedRequest = {
        seq: ++this.seq,
        path,
        prompt,
        toolResults: toolResults.size,
        bytes: 0,
        completed: false,
        aborted: req.signal.aborted,
      };
      this.entries.push(entry);
      if (this.entries.length > MAX_SERVED) this.entries.shift();
      req.signal.addEventListener(
        "abort",
        () => {
          entry.aborted = true;
        },
        { once: true },
      );

      const response = await handler(req);
      if (!response.body) {
        entry.completed = true;
        return response;
      }
      const body = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            entry.bytes += chunk.byteLength;
            controller.enqueue(chunk);
          },
          flush() {
            entry.completed = true;
          },
        }),
      );
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    };
  }
}

export const createWebviewRoutes = (): WebviewRoutes => {
  const log = new ServedRequestLog();
  return {
    [CHAT_ROUTE]: { POST: log.record(CHAT_ROUTE, chat) },
    [MODEL_ROUTE]: { POST: log.record(MODEL_ROUTE, model) },
    [SERVED_REQUESTS_ROUTE]: { GET: () => Response.json(log.list()) },
  };
};
