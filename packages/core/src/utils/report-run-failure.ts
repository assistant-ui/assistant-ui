import { isMessageNotSentError } from "../types/error";

// For entry points that drop their task, a rejection has no caller to reach and
// would surface as an unhandled rejection after the runtime has already
// recorded the failure. An undispatched send belongs to the composer.
export const reportRunFailure = (
  label: string,
  task: void | Promise<void>,
): void => {
  void Promise.resolve(task).catch((error: unknown) => {
    if (isMessageNotSentError(error)) return;
    console.error(`[assistant-ui] ${label} failed`, error);
  });
};
