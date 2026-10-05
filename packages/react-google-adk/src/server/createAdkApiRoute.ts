import { parseAdkRequest, toAdkContent } from "./parseAdkRequest";
import { adkEventStream, type AdkEventStreamOptions } from "./adkEventStream";

/**
 * Loose runner type matching the ADK SDK's Runner interface.
 * Avoids requiring `@google/adk` as a dependency.
 */
type AdkRunner = {
  readonly appName?: string;
  readonly sessionService?: {
    getSession(options: {
      appName: string;
      userId: string;
      sessionId: string;
    }): Promise<unknown | undefined>;
    createSession(options: {
      appName: string;
      userId: string;
      sessionId: string;
    }): Promise<unknown>;
  };
  runAsync(
    options: Record<string, unknown>,
  ): AsyncGenerator<any, void, undefined>;
};

type AdkSessionService = NonNullable<AdkRunner["sessionService"]>;

const pendingSessions = new WeakMap<
  AdkSessionService,
  Map<string, Promise<void>>
>();

const ensureRunnerSession = async (
  runner: AdkRunner,
  userId: string,
  sessionId: string,
) => {
  const { appName, sessionService } = runner;
  if (!appName || !sessionService) return;

  let serviceSessions = pendingSessions.get(sessionService);
  if (!serviceSessions) {
    serviceSessions = new Map();
    pendingSessions.set(sessionService, serviceSessions);
  }

  const key = JSON.stringify([appName, userId, sessionId]);
  let pending = serviceSessions.get(key);
  if (!pending) {
    pending = (async () => {
      const session = await sessionService.getSession({
        appName,
        userId,
        sessionId,
      });
      if (!session) {
        try {
          await sessionService.createSession({ appName, userId, sessionId });
        } catch (error) {
          const existing = await sessionService.getSession({
            appName,
            userId,
            sessionId,
          });
          if (!existing) throw error;
        }
      }
    })();
    serviceSessions.set(key, pending);
  }

  try {
    await pending;
  } finally {
    if (serviceSessions.get(key) === pending) serviceSessions.delete(key);
  }
};

export type CreateAdkApiRouteOptions = {
  /**
   * ADK Runner instance.
   */
  runner: AdkRunner;

  /**
   * User ID to use for the ADK session. Production routes should resolve this
   * from the authenticated request. A static value is suitable only for a
   * single-user development route.
   */
  userId: string | ((req: Request) => string | Promise<string>);

  /**
   * Session ID to use. Can be a static string or a function
   * that validates or transforms the client thread ID sent by
   * `createAdkStream`. The client value is an identifier, not authorization;
   * scope access with an authenticated `userId`.
   */
  sessionId:
    | string
    | ((
        req: Request,
        clientSessionId: string | undefined,
      ) => string | Promise<string>);

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
 * import { requireUser } from './auth';
 *
 * export const POST = createAdkApiRoute({
 *   runner,
 *   userId: async (req) => (await requireUser(req)).id,
 *   sessionId: (_req, clientSessionId) => {
 *     if (!clientSessionId) throw new Error("Missing ADK session ID");
 *     return clientSessionId;
 *   },
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
        ? await options.sessionId(req, parsed.sessionId)
        : options.sessionId;

    await ensureRunnerSession(options.runner, userId, sessionId);

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
