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
   * Validates or replaces the client-provided ADK run configuration.
   * Client values are ignored unless this resolver is provided.
   */
  resolveRunConfig?:
    | ((req: Request, runConfig: unknown) => unknown | Promise<unknown>)
    | undefined;

  /**
   * Validates or replaces the client-provided ADK state delta.
   * Client values are ignored unless this resolver is provided. In particular,
   * `app:` and `user:` keys affect state beyond the current session.
   */
  resolveStateDelta?:
    | ((
        req: Request,
        stateDelta: Record<string, unknown> | undefined,
      ) =>
        | Record<string, unknown>
        | undefined
        | Promise<Record<string, unknown> | undefined>)
    | undefined;

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

    const runConfig = options.resolveRunConfig
      ? await options.resolveRunConfig(req, parsed.config.runConfig)
      : undefined;
    const stateDelta = options.resolveStateDelta
      ? await options.resolveStateDelta(req, parsed.stateDelta)
      : undefined;

    const events = options.runner.runAsync({
      userId,
      sessionId,
      newMessage,
      ...(stateDelta != null && { stateDelta }),
      ...(runConfig != null && { runConfig }),
    });

    return adkEventStream(
      events,
      options.onError ? { onError: options.onError } : undefined,
    );
  };
}
