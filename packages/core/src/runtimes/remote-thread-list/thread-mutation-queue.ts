export class ThreadMutationQueue {
  private readonly pending = new Map<string, Promise<void>>();

  reserve(threadId: string) {
    const previous = this.pending.get(threadId);
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.pending.set(threadId, current);
    let started = false;
    const finish = () => {
      release();
      if (this.pending.get(threadId) === current) this.pending.delete(threadId);
    };
    return {
      run: async <T>(call: () => Promise<T>): Promise<T> => {
        started = true;
        try {
          if (previous) await previous;
          return await call();
        } finally {
          finish();
        }
      },
      cancel: () => {
        if (!started) finish();
      },
    };
  }
}
