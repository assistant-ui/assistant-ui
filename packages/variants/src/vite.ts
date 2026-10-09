import {
  handleNotesRequest,
  readJsonBody,
  type AllowedHosts,
  type NotesRequest,
} from "./server/handler";

export const NOTES_PATH = "/__variants";

type IncomingRequest = AsyncIterable<Uint8Array | string> & {
  method?: string | undefined;
  url?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
};

type OutgoingResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  end: (body?: string) => unknown;
};

type DevServer = {
  config: {
    root: string;
    server?: { allowedHosts?: readonly string[] | true | undefined };
  };
  middlewares: {
    use: (
      path: string,
      handler: (
        request: IncomingRequest,
        response: OutgoingResponse,
        next: () => void,
      ) => void,
    ) => unknown;
  };
};

export type VariantsPluginOptions = {
  /** Directory scanned and written; defaults to Vite's `root`. */
  root?: string | undefined;
  /**
   * Hosts besides loopback that may reach the endpoints, with Vite's
   * `server.allowedHosts` semantics, merged with Vite's own `server.allowedHosts`.
   */
  allowedHosts?: AllowedHosts | undefined;
};

/**
 * Vite plugin that serves the note endpoints under `/__variants` while the
 * dev server runs, so notes are written into source as `@variants-note`
 * markers. Builds are untouched (`apply: "serve"`).
 */
export function variants(options: VariantsPluginOptions = {}) {
  return {
    name: "variants",
    apply: "serve" as const,
    configureServer(server: DevServer) {
      const root = options.root ?? server.config.root;
      const own = options.allowedHosts ?? [];
      const vite = server.config.server?.allowedHosts ?? [];
      const allowedHosts: AllowedHosts =
        own === true || vite === true ? true : [...own, ...vite];
      server.middlewares.use(NOTES_PATH, (request, response) => {
        const header = (name: string) => {
          const value = request.headers[name.toLowerCase()];
          return (Array.isArray(value) ? value[0] : value) ?? null;
        };
        const notesRequest: NotesRequest = {
          method: request.method ?? "GET",
          path: request.url ?? "/",
          header,
          json: () => readJsonBody(request),
        };
        void handleNotesRequest(notesRequest, { root, dev: true, allowedHosts })
          .catch(() => ({ status: 500, body: { error: "failed" } }))
          .then(({ status, body }) => {
            response.statusCode = status;
            response.setHeader("content-type", "application/json");
            response.setHeader("cache-control", "no-store");
            response.end(JSON.stringify(body));
          });
      });
    },
  };
}
