import type { RouteHandler, WebviewRoutes } from "@assistant-ui/vscode/host";
import * as vscode from "vscode";
import { POST as chat } from "./fixtures/route";
import { readFixtureRequest } from "./fixtures/request";
import type { ExternalOpener } from "./open-external";
import {
  CHAT_ROUTE,
  COLOR_THEME_ROUTE,
  OPEN_EXTERNAL_ROUTE,
  SERVED_REQUESTS_ROUTE,
  type ColorThemeState,
  type ColorThemeUpdate,
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

/** Lets the theme-follows probe switch the colour theme and restore it. */
const colorTheme = {
  GET: () => {
    const config = vscode.workspace.getConfiguration("workbench");
    const state: ColorThemeState = {
      current: config.get<string>("colorTheme") ?? "",
      userValue: config.inspect<string>("colorTheme")?.globalValue ?? null,
    };
    return Response.json(state);
  },
  PUT: async (req: Request) => {
    const { theme } = (await req.json()) as ColorThemeUpdate;
    await vscode.workspace
      .getConfiguration("workbench")
      .update(
        "colorTheme",
        theme ?? undefined,
        vscode.ConfigurationTarget.Global,
      );
    return new Response(null, { status: 204 });
  },
};

export const createWebviewRoutes = (
  externalOpener: ExternalOpener,
): WebviewRoutes => {
  const log = new ServedRequestLog();
  return {
    [CHAT_ROUTE]: { POST: log.record(CHAT_ROUTE, chat) },
    [SERVED_REQUESTS_ROUTE]: { GET: () => Response.json(log.list()) },
    [COLOR_THEME_ROUTE]: colorTheme,
    [OPEN_EXTERNAL_ROUTE]: {
      GET: () => Response.json(externalOpener.state()),
      PUT: async (req) => {
        const { stub } = (await req.json()) as { stub: boolean };
        externalOpener.stub = stub;
        return new Response(null, { status: 204 });
      },
    },
  };
};
