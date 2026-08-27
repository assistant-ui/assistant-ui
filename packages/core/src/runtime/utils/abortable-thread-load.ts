export type AbortableThreadLoadPurpose = "initial" | "reload";

type AbortableThreadLoadOptions = {
  purpose?: AbortableThreadLoadPurpose;
  load: (signal: AbortSignal) => Promise<void>;
  onSettled: () => void;
  onInitialError: (error: unknown) => void;
};

export const createAbortableThreadLoad = () => {
  let current: {
    controller: AbortController;
    purpose: AbortableThreadLoadPurpose;
    promise?: Promise<void>;
  } | null = null;

  return {
    abort(purpose?: AbortableThreadLoadPurpose) {
      if (purpose !== undefined && current?.purpose !== purpose) return;
      current?.controller.abort();
    },
    run({
      purpose = "initial",
      load,
      onSettled,
      onInitialError,
    }: AbortableThreadLoadOptions): Promise<void> {
      if (purpose === "reload" && current?.purpose === "initial") {
        return current.promise ?? Promise.resolve();
      }

      current?.controller.abort();
      const controller = new AbortController();
      const record: NonNullable<typeof current> = { controller, purpose };
      current = record;

      const task = load(controller.signal)
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          throw error;
        })
        .finally(() => {
          if (current?.controller === controller) current = null;
          if (controller.signal.aborted) return;
          onSettled();
        });
      record.promise = task;

      if (purpose === "reload") return task;
      return task.catch(onInitialError);
    },
  };
};
