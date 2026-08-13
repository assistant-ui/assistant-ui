const generations = new WeakMap<object, number>();
const disposed = new WeakSet<object>();

export const captureThreadRuntimeGeneration = (runtime: object) =>
  generations.get(runtime) ?? 0;

export const isThreadRuntimeGenerationCurrent = (
  runtime: object,
  generation: number,
) =>
  !disposed.has(runtime) &&
  captureThreadRuntimeGeneration(runtime) === generation;

export const disposeThreadRuntime = (runtime: object) => {
  generations.set(runtime, captureThreadRuntimeGeneration(runtime) + 1);
  disposed.add(runtime);
};
