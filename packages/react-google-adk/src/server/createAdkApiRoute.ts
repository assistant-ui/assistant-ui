import { parseAdkRequest, toAdkContent } from "./parseAdkRequest";
import { adkEventStream, type AdkEventStreamOptions } from "./adkEventStream";

/**
 * Loose runner type matching the ADK SDK's Runner interface.
 * Avoids requiring `@google/adk` as a dependency.
 */
type AdkRunner = {
  runAsync(
    options: Record<string, unknown>,
  ): AsyncGenerator<any, void, undefined>;
};

export type CreateAdkApiRouteOptions = {
  /**
   * ADK Runner instance.
   */
  runner: AdkRunner;

  /**
   * User ID to use for the ADK session. Can be a static string
   * or a function that extracts it from the request.
   */
  userId: string | ((req: Request) => string | Promise<string>);

  /**
   * Session ID to use. Can be a static string or a function
   * that extracts it from the request (e.g. from query params or headers).
   */
  sessionId: string | ((req: Request) => string | Promise<string>);

  /**
   * Error handler for stream errors.
   */
  onError?: AdkEventStreamOptions["onError"];
};

/**
 * Creates a request handler that combines `parseAdkRequest`, `toAdkContent`,
 * and `adkEventStream` into a single function.
 *
 * @example Next.js App Router
 * ```ts
 * import { createAdkApiRoute } from '@assistant-ui/react-google-adk/server';
 * import { runner } from './agent';
 *
 * export const POST = createAdkApiRoute({
 *   runner,
 *   userId: "default-user",
 *   sessionId: (req) => new URL(req.url).searchParams.get("sessionId") ?? "default",
 * });
 * ```
 */
export function createAdkApiRoute(
  options: CreateAdkApiRouteOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const parsed = await parseAdkRequest(req);
    const newMessage = toAdkContent(parsed);

    const userId =
      typeof options.userId === "function"
        ? await options.userId(req)
        : options.userId;

    const sessionId =
      typeof options.sessionId === "function"
        ? await options.sessionId(req)
        : options.sessionId;

    const events = options.runner.runAsync({
      userId,
      sessionId,
      newMessage,
      ...(parsed.stateDelta != null && { stateDelta: parsed.stateDelta }),
      ...(parsed.config.runConfig != null && {
        runConfig: parsed.config.runConfig,
      }),
    });

    return adkEventStream(
      events,
      options.onError ? { onError: options.onError } : undefined,
    );
  };
}
