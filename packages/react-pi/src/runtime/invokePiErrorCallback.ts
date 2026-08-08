import type { PiRuntimeOptions } from "./runtimeTypes";

const reportPiCallbackError = (callbackError: unknown) => {
  console.error("[react-pi] onError callback threw an error", callbackError);
};

export const invokePiErrorCallback = (
  onError: PiRuntimeOptions["onError"],
  error: unknown,
) => {
  if (!onError) return;
  try {
    void Promise.resolve(onError(error)).catch(reportPiCallbackError);
  } catch (callbackError) {
    reportPiCallbackError(callbackError);
  }
};
