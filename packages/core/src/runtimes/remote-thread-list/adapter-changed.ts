import { SILENT_RUNTIME_ACTION } from "../../utils/silent-runtime-action";

export class ThreadListAdapterChangedError extends Error {
  readonly [SILENT_RUNTIME_ACTION] = true;

  constructor() {
    super("Thread list adapter changed while an operation was pending.");
    this.name = "ThreadListAdapterChangedError";
  }
}
