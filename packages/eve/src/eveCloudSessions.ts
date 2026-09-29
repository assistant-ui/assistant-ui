type PendingSession = {
  readonly promise: Promise<string>;
  readonly resolve: (sessionId: string) => void;
  readonly reject: (error: unknown) => void;
  sessionId?: string;
};

const createPendingSession = (): PendingSession => {
  let resolve!: (sessionId: string) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<string>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  // A thread can fail its first turn before the thread list asks for its session.
  promise.catch(() => {});
  return { promise, resolve, reject };
};

/** Lets the cloud thread list wait for the eve session a new thread's first turn creates, because eve assigns a session id only once that turn is accepted while a cloud thread takes its external id when it is created. */
export const createEveCloudSessions = () => {
  const pending = new Map<string, PendingSession>();

  const get = (threadId: string) => {
    let session = pending.get(threadId);
    if (!session) {
      session = createPendingSession();
      pending.set(threadId, session);
    }
    return session;
  };

  return {
    wait: (threadId: string) => get(threadId).promise,
    resolve: (threadId: string, sessionId: string) => {
      const session = get(threadId);
      if (session.sessionId !== undefined) return;
      session.sessionId = sessionId;
      session.resolve(sessionId);
    },
    reject: (threadId: string, error: Error) => {
      const session = pending.get(threadId);
      if (!session || session.sessionId !== undefined) return;
      pending.delete(threadId);
      session.reject(error);
    },
    release: (threadId: string) => {
      const session = pending.get(threadId);
      pending.delete(threadId);
      session?.reject(
        new Error(
          "The thread's eve runtime unmounted before its first turn created a session.",
        ),
      );
    },
  };
};

export type EveCloudSessions = ReturnType<typeof createEveCloudSessions>;
