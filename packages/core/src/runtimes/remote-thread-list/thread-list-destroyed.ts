import { SILENT_RUNTIME_ACTION } from "../../utils/silent-runtime-action";

export class ThreadListDestroyedError extends Error {
  readonly [SILENT_RUNTIME_ACTION] = true;

  constructor() {
    super("Thread list was destroyed while an operation was pending.");
    this.name = "ThreadListDestroyedError";
  }
}
