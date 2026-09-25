import { isMessageNotSentError } from "../types/error";

// The public entry points are typed `void`, so most callers drop this task and
// a rejection would surface as an unhandled rejection after the runtime has
// already recorded the failure. An undispatched send belongs to the composer.
export const reportRunFailure = <T extends void | Promise<void>>(
  label: string,
  task: T,
): T => {
  void Promise.resolve(task).catch((error: unknown) => {
    if (isMessageNotSentError(error)) return;
    console.error(`[assistant-ui] ${label} failed`, error);
  });
  return task;
};
