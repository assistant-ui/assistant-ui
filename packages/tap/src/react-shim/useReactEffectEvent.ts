import React, { useCallback, useLayoutEffect, useRef } from "react";

const ReactRuntime = React as any;

function useReactEffectEventShim<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    [],
  );
}

export const useReactEffectEvent: typeof useReactEffectEventShim =
  ReactRuntime.useEffectEvent ?? useReactEffectEventShim;
