export class ThreadListAdapterChangedError extends Error {
  constructor() {
    super("Thread list adapter changed while an operation was pending.");
    this.name = "ThreadListAdapterChangedError";
  }
}
