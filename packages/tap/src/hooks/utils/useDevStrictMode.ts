import { useRef, useState } from "react";
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

const child = () => "child" as const;
const notDevMode = () => null;

const useDevStrictModeTap = () => {
  return getTapDevMode;
};

export const useDevStrictModeReact = () => {
  if (!isDevelopment) return notDevMode;

  // oxlint-disable-next-line react/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  const count = useRef(0);
  // oxlint-disable-next-line react/rules-of-hooks -- isDevelopment is a build-time constant, so this branch is stable per build
  useState(() => count.current++);
  if (count.current !== 2) return notDevMode;
  return child;
};

export const useDevStrictMode = () => {
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return peekResourceFiber() ? useDevStrictModeTap() : useDevStrictModeReact();
};
