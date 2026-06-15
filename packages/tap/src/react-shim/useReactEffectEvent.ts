import React, { useCallback, useInsertionEffect, useRef } from "react";

const ReactRuntime = React as any;

// Keep this local so @assistant-ui/tap stays runtime-dependency-free.
function useReactEffectEventShim<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = useRef(callback);

  useInsertionEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    [],
  );
}

export const useReactEffectEvent: typeof useReactEffectEventShim =
  ReactRuntime.useEffectEvent ?? useReactEffectEventShim;
