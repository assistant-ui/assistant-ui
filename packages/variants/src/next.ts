import { handleNotesRequest } from "./server/handler";

const MOUNT = "/__variants";

const handle = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const at = url.pathname.indexOf(MOUNT);
  const path = `${at === -1 ? url.pathname : url.pathname.slice(at + MOUNT.length) || "/"}${url.search}`;
  const { status, body } = await handleNotesRequest(
    {
      method: request.method,
      path,
      header: (name) => request.headers.get(name),
      json: async () => {
        const text = await request.text();
        if (text.length > 64 * 1024) throw new Error("request body too large");
        return JSON.parse(text) as unknown;
      },
    },
    {
      root: process.cwd(),
      dev: process.env.NODE_ENV === "development",
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
 * They answer 404 unless `NODE_ENV` is `development`.
 */
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
