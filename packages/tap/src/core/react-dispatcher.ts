import * as React from "react";
import { useState } from "../hooks/useState";
import { useReducer } from "../hooks/useReducer";
import { useRef } from "../hooks/useRef";
import { useMemo } from "../hooks/useMemo";
import { useCallback } from "../hooks/useCallback";
import { useEffect } from "../hooks/useEffect";
import { useEffectEvent } from "../hooks/useEffectEvent";
import { use } from "../hooks/use";
import { useMemoCache } from "../hooks/useMemoCache";

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
  useEffectEvent,
  useContext: use,
  use,
  useMemoCache,
};

// React's live dispatcher slot differs by version: React 19 exposes it as `H` on
// the client internals object; React 18 as `ReactCurrentDispatcher.current`.
const internals =
  (React as any)
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

const slot: { current: unknown } | null =
  "H" in internals
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
