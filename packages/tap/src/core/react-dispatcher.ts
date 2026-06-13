import React from "react";

import { useState } from "../react-hooks/useState";
import { useReducer } from "../react-hooks/useReducer";
import { useRef } from "../react-hooks/useRef";
import { useMemo } from "../react-hooks/useMemo";
import { useCallback } from "../react-hooks/useCallback";
import { useEffect } from "../react-hooks/useEffect";
import { useEffectEvent } from "../react-hooks/useEffectEvent";
import { use } from "../react-hooks/use";
import { useSyncExternalStore } from "../react-hooks/useSyncExternalStore";
import { useDebugValue } from "../react-hooks/useDebugValue";

// The dispatcher React reads while a resource renders, so hooks imported from
// "react" route to tap with no build step. Hooks tap has no equivalent for are
// intentionally absent: calling one throws, which is the intended "unsupported
// in a resource" signal.
const tapDispatcher = {
  useState,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect: useEffect,
  useInsertionEffect: useEffect,
  useEffectEvent,
  useContext: use,
  use,
  useSyncExternalStore,
  useDebugValue,
};

// React's live dispatcher slot differs by version: React 19 exposes it as `H` on
// the client internals object; React 18 as `ReactCurrentDispatcher.current`.
const ReactRuntime = React as any;
const internals =
  ReactRuntime.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  ReactRuntime.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

const slot: { current: unknown } | null =
  internals == null
    ? null
    : "H" in internals
      ? {
          get current() {
            return internals.H;
          },
          set current(d) {
            internals.H = d;
          },
        }
      : "ReactCurrentDispatcher" in internals
        ? {
            get current() {
              return internals.ReactCurrentDispatcher.current;
            },
            set current(d) {
              internals.ReactCurrentDispatcher.current = d;
            },
          }
        : null;

/**
 * Runs a resource body with tap's React dispatcher installed, so real React
 * hooks called inside it (`import { useState } from "react"`) route to tap, then
 * restores the previous dispatcher. If React's internal dispatcher slot can't be
 * found (an unsupported React version), the body runs unchanged and `react`
 * hooks inside it keep throwing React's "invalid hook call".
 */
export function withReactDispatcher<T>(render: () => T): T {
  if (!slot) return render();

  const previous = slot.current;
  slot.current = tapDispatcher;
  try {
    return render();
  } finally {
    slot.current = previous;
  }
}
