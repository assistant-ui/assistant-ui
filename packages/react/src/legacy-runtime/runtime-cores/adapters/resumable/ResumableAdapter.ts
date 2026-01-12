export type ResumableStateStorage = {
  getStreamId(): string | null;
  setStreamId(streamId: string): void;
  getState<T>(): T | null;
  setState<T>(state: T): void;
  clearAll(): void;
};

export type ResumableAdapter = {
  storage?: ResumableStateStorage;
  onResumingChange?: (isResuming: boolean) => void;
};
