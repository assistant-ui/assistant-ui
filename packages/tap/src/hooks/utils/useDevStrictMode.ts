import { useLayoutEffect, useRef, useState } from "react";
import { isDevelopment } from "../../core/helpers/env";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "../../core/helpers/execution-context";

const getTapDevMode = () => {
  const currentResourceFiber = getCurrentResourceFiber();
  if (currentResourceFiber.devStrictMode)
    return currentResourceFiber.isFirstRender
      ? ("child" as const)
      : ("root" as const);
  return null;
};

const notDevMode = () => null;

/* oxlint-disable react/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is fixed per build. */
const useDevStrictModeReact = () => {
  if (!isDevelopment) return notDevMode;

  const count = useRef(0);
  useState(() => count.current++);
  const detectedOnRender = count.current === 2;
  const strictMode = useRef(false);
  const effectMountCount = useRef(0);
  const [, forceRender] = useState(0);

  useLayoutEffect(() => {
    if (detectedOnRender || effectMountCount.current++ !== 1) return;
    strictMode.current = true;
    forceRender((value) => value + 1);
  }, [detectedOnRender]);

  return () =>
    detectedOnRender || strictMode.current ? ("child" as const) : null;
};
/* oxlint-enable react/rules-of-hooks */

export const useDevStrictMode = () => {
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return peekResourceFiber() ? getTapDevMode : useDevStrictModeReact();
};
