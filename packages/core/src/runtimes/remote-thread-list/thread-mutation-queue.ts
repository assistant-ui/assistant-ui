type Mutation = {
  order: number;
  done: Promise<void>;
  previous: Promise<void> | undefined;
  running: boolean;
};

export class ThreadMutationQueue {
  private readonly pending = new Map<string, Mutation[]>();
  private readonly aliases = new Map<string, string>();
  private nextOrder = 0;

  private resolve(threadId: string): string {
    let target = this.aliases.get(threadId);
    while (target !== undefined) {
      threadId = target;
      target = this.aliases.get(threadId);
    }
    return threadId;
  }

  merge(threadId: string, otherThreadId: string) {
    const target = this.resolve(threadId);
    const source = this.resolve(otherThreadId);
    if (target === source) return;
    this.aliases.set(source, target);
    const mutations = [
      ...(this.pending.get(target) ?? []),
      ...(this.pending.get(source) ?? []),
    ].sort(
      (a, b) => Number(b.running) - Number(a.running) || a.order - b.order,
    );
    this.pending.delete(source);
    if (mutations.length === 0) return;
    let previous: Promise<void> | undefined;
    for (const mutation of mutations) {
      mutation.previous = previous;
      previous = mutation.done;
    }
    this.pending.set(target, mutations);
  }

  reserve(
    threadId: string,
    thread?: {
      remoteId: string | undefined;
      initializeTask: Promise<unknown>;
    },
  ) {
    const ready =
      thread?.remoteId === undefined ? thread?.initializeTask : undefined;
    const id = this.resolve(threadId);
    const mutations = this.pending.get(id) ?? [];
    let release!: () => void;
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current: Mutation = {
      order: this.nextOrder++,
      done,
      previous: mutations.at(-1)?.done,
      running: false,
    };
    mutations.push(current);
    this.pending.set(id, mutations);
    let started = false;
    const finish = () => {
      release();
      const target = this.resolve(threadId);
      const queue = this.pending.get(target)!;
      queue.splice(queue.indexOf(current), 1);
      if (queue.length === 0) this.pending.delete(target);
    };
    const afterPrevious = async <T>(call: () => T | Promise<T>): Promise<T> => {
      let previous: Promise<void> | undefined;
      do {
        previous = current.previous;
        if (previous) await previous;
      } while (previous !== current.previous);
      return call();
    };
    return {
      run: async <T>(call: () => Promise<T>): Promise<T> => {
        started = true;
        try {
          if (ready) await ready.catch(() => {});
          return await afterPrevious(() => {
            current.running = true;
            return call();
          });
        } finally {
          void afterPrevious(finish);
        }
      },
      cancel: () => {
        if (!started) {
          started = true;
          void afterPrevious(finish);
        }
      },
    };
  }
}
