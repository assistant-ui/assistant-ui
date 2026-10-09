"use client";

import { useSyncExternalStore } from "react";

const SELECTOR = "[data-sub-project-header-portal]";

const subscribe = () => () => {};

const getSnapshot = () => document.querySelector<HTMLElement>(SELECTOR);

const getServerSnapshot = () => null;

/** The sub-project header's portal target, `null` until the client renders. */
export function useHeaderPortalContainer() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
