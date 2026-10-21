export const createHistoryWriteChain = () => {
  const writes = new Map<string, Promise<void>>();

  const track = (id: string, write: Promise<void>) => {
    writes.set(id, write);
    const settle = () => {
      if (writes.get(id) === write) writes.delete(id);
    };
    void write.then(settle, settle);
  };

  return {
    pending: (id: string) => writes.get(id),
    chain: (id: string, write: () => Promise<void>): Promise<void> => {
      const pending = writes.get(id);
      let next: Promise<void>;
      if (pending) {
        next = pending.then(write, write);
      } else {
        try {
          next = Promise.resolve(write());
        } catch (error) {
          next = Promise.reject(error);
        }
      }
      track(id, next);
      return next;
    },
    move: (oldId: string, newId: string | undefined) => {
      const pending = writes.get(oldId);
      if (!pending) return undefined;
      writes.delete(oldId);
      if (newId !== undefined) track(newId, pending);
      return pending;
    },
  };
};
