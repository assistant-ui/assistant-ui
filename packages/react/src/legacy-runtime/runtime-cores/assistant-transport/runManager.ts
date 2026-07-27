import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "./useLatestRef";

export type RunManager = Readonly<{
  isRunning: boolean;
  schedule: () => void;
  cancel: () => void;
}>;

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

    queueMicrotask(async () => {
      try {
        await onRunRef.current(ac.signal);
      } catch (error) {
        stateRef.current.pending = false;
        if (stateRef.current.disposed) {
          // unmount aborted the run; no callbacks
        } else if (ac.signal.aborted) {
          onCancelRef.current?.();
        } else {
          await onErrorRef.current?.(error as Error);
        }
      } finally {
        if (stateRef.current.disposed) {
          stateRef.current.abortController = null;
        } else {
          onFinishRef.current?.();
          if (stateRef.current.pending) {
            startRun();
          } else {
            setIsRunning(false);
            stateRef.current.abortController = null;
          }
        }
      }
    });
  }, [onRunRef, onFinishRef, onErrorRef, onCancelRef]);

  const schedule = useCallback(() => {
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
      stateRef.current.abortController?.abort();
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
