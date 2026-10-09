import {
  handleNotesRequest,
  readJsonBody,
  type AllowedHosts,
} from "./server/handler";

const MOUNT = "/__variants";

async function* chunks(body: ReadableStream<Uint8Array> | null) {
  if (!body) return;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export type VariantsRouteOptions = {
  /**
   * Hosts besides loopback that may reach the endpoints, with Vite's
   * `server.allowedHosts` semantics: `.example.test` also allows subdomains.
   */
  allowedHosts?: AllowedHosts | undefined;
};

const handle = async (
  request: Request,
  options: VariantsRouteOptions,
): Promise<Response> => {
  const url = new URL(request.url);
  const at = url.pathname.indexOf(MOUNT);
  const path = `${at === -1 ? url.pathname : url.pathname.slice(at + MOUNT.length) || "/"}${url.search}`;
  const { status, body } = await handleNotesRequest(
    {
      method: request.method,
      path,
      header: (name) => request.headers.get(name),
      json: () => readJsonBody(chunks(request.body)),
    },
    {
      root: process.cwd(),
      dev: process.env.NODE_ENV === "development",
      allowedHosts: options.allowedHosts,
    },
  );
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

/**
 * Route handlers for the note endpoints. Mount them once, at
 * `app/%5F_variants/[...path]/route.ts` (the encoded underscore keeps the
 * folder routable at `/__variants`):
 *
 * ```ts
 * export { GET, POST, DELETE } from "@assistant-ui/variants/next";
 * ```
 *
 * They answer 404 unless `NODE_ENV` is `development`, and 403 unless the
 * `Host` is loopback. For another dev host, use `createVariantsRoutes`.
 */
export const createVariantsRoutes = (options: VariantsRouteOptions = {}) => {
  const route = (request: Request) => handle(request, options);
  return { GET: route, POST: route, DELETE: route };
};

export const { GET, POST, DELETE } = createVariantsRoutes();
