import { useEffect, useRef } from "react";

export const useResourceCleanup = (cleanup: () => void) => {
  const lifecycleRef = useRef({ cleanup, generation: 0 });

  useEffect(() => {
    lifecycleRef.current.cleanup = cleanup;
  });

  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    const generation = ++lifecycle.generation;
    return () => {
      // Ignore Strict Mode's immediate cleanup when the same owner remounts.
      queueMicrotask(() => {
        if (lifecycle.generation === generation) {
          lifecycle.cleanup();
        }
      });
    };
  }, []);
};
