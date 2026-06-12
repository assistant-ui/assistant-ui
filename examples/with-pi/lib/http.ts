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
  <Args extends unknown[]>(
    handler: (...args: Args) => Response | Promise<Response>,
  ) =>
  async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return fail(error);
    }
  };
