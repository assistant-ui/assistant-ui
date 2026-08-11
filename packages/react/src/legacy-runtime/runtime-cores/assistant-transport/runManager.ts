import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "./useLatestRef";

export type RunManager = Readonly<{
  isRunning: boolean;
  schedule: () => void;
  cancel: () => void;
}>;

const disposeReason = Symbol("assistant-transport-dispose");

const reportFinishError = (error: unknown) => {
  console.error(
    "[assistant-ui] Assistant transport onFinish callback threw an error",
    error,
  );
};

export function useRunManager(config: {
  onRun: (signal: AbortSignal) => Promise<void>;
  onFinish?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  onError?: ((error: Error) => void | Promise<void>) | undefined;
}): RunManager {
  const [isRunning, setIsRunning] = useState(false);
  const stateRef = useRef({
    pending: false,
    disposed: false,
    abortController: null as AbortController | null,
  });
  const onRunRef = useLatestRef(config.onRun);
  const onFinishRef = useLatestRef(config.onFinish);
  const onCancelRef = useLatestRef(config.onCancel);
  const onErrorRef = useLatestRef(config.onError);

  const startRun = useCallback(() => {
    setIsRunning(true);
    stateRef.current.pending = false;
    const ac = new AbortController();
    stateRef.current.abortController = ac;

    // The dispose marker rides on the abort reason so a settling run detects
    // its own disposal even after an effect cycle re-arms the manager.
    const disposeAborted = () => ac.signal.reason === disposeReason;

    queueMicrotask(async () => {
      try {
        if (!disposeAborted()) {
          await onRunRef.current(ac.signal);
        }
      } catch (error) {
        if (!disposeAborted() && !stateRef.current.disposed) {
          stateRef.current.pending = false;
          if (ac.signal.aborted) {
            onCancelRef.current?.();
          } else {
            await onErrorRef.current?.(error as Error);
          }
        }
      } finally {
        if (!disposeAborted() && !stateRef.current.disposed) {
          try {
            void Promise.resolve(onFinishRef.current?.()).catch(
              reportFinishError,
            );
          } catch (error) {
            reportFinishError(error);
          }
        }
        if (!stateRef.current.disposed && stateRef.current.pending) {
          startRun();
        } else {
          setIsRunning(false);
          if (stateRef.current.abortController === ac) {
            stateRef.current.abortController = null;
          }
        }
      }
    });
  }, [onRunRef, onFinishRef, onErrorRef, onCancelRef]);

  const schedule = useCallback(() => {
    if (stateRef.current.disposed) return;
    if (stateRef.current.abortController) {
      // Coalesce multiple schedules while running into a single follow-up run.
      stateRef.current.pending = true;
      return;
    }
    startRun();
  }, [startRun]);

  // Strict-mode effects run setup / cleanup / setup on the same instance;
  // arming on setup undoes the cleanup's dispose.
  useEffect(() => {
    stateRef.current.disposed = false;
    return () => {
      stateRef.current.disposed = true;
      stateRef.current.pending = false;
      stateRef.current.abortController?.abort(disposeReason);
    };
  }, []);

  const cancel = useCallback(() => {
    stateRef.current.pending = false;
    stateRef.current.abortController?.abort();
  }, []);

  return {
    isRunning,
    schedule,
    cancel,
  };
}
