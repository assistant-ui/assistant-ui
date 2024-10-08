export type StreamPart<T extends Record<string, unknown>> = {
  [K in keyof T]: { type: K; value: T[K] };
}[keyof T];
