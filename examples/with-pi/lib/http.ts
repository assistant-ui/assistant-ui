import { getPiRequestRejection } from "./pi-request-guard";

/** Shared response helpers for the Pi example routes. */

/** 500 with a JSON `{ error }` body — `createPiHttpClient` surfaces the text. */
export const fail = (error: unknown): Response =>
  Response.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  );

/** 400 with a JSON `{ error }` body, for invalid request input. */
export const badRequest = (message: string): Response =>
  Response.json({ error: message }, { status: 400 });

/** 204 for write endpoints that return nothing. */
export const noContent = (): Response => new Response(null, { status: 204 });

/** Wrap a route handler so any thrown error becomes a `fail()` response. */
export const withFail =
  <Req extends Request, Args extends unknown[]>(
    handler: (request: Req, ...args: Args) => Response | Promise<Response>,
  ) =>
  async (request: Req, ...args: Args): Promise<Response> => {
    const rejection = getPiRequestRejection(request);
    if (rejection) return rejection;
    try {
      return await handler(request, ...args);
    } catch (error) {
      return fail(error);
    }
  };
