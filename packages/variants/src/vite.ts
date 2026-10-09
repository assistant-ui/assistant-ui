import { handleNotesRequest, type NotesRequest } from "./server/handler";

export const NOTES_PATH = "/__variants";
const MAX_BODY = 64 * 1024;

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
  config: { root: string };
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
};

const readJson = async (request: IncomingRequest): Promise<unknown> => {
  let size = 0;
  let text = "";
  const decoder = new TextDecoder();
  for await (const chunk of request) {
    const bytes =
      typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    size += bytes.length;
    if (size > MAX_BODY) throw new Error("request body too large");
    text += decoder.decode(bytes, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
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
      server.middlewares.use(NOTES_PATH, (request, response) => {
        const header = (name: string) => {
          const value = request.headers[name.toLowerCase()];
          return (Array.isArray(value) ? value[0] : value) ?? null;
        };
        const notesRequest: NotesRequest = {
          method: request.method ?? "GET",
          path: request.url ?? "/",
          header,
          json: () => readJson(request),
        };
        void handleNotesRequest(notesRequest, { root, dev: true })
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
