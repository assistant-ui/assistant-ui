import type { PiRuntimeOptions } from "./runtimeTypes";

export const invokePiErrorCallback = (
  onError: PiRuntimeOptions["onError"],
  error: unknown,
) => {
  try {
    onError?.(error);
  } catch (callbackError) {
    console.error(
      "[assistant-ui/react-pi] onError callback threw an error",
      callbackError,
    );
  }
};
