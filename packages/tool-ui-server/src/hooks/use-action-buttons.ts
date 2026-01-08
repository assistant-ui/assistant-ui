"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Action } from "../schemas/shared";

export type UseActionButtonsOptions = {
  actions: Action[];
  onAction: (actionId: string) => void | Promise<void>;
  onBeforeAction?:
    | ((actionId: string) => boolean | Promise<boolean>)
    | undefined;
  confirmTimeout?: number | undefined;
};

export type UseActionButtonsResult = {
  actions: Array<
    Action & {
      currentLabel: string;
      isConfirming: boolean;
      isExecuting: boolean;
      isDisabled: boolean;
      isLoading: boolean;
    }
  >;
  runAction: (actionId: string) => Promise<void>;
  confirmingActionId: string | null;
  executingActionId: string | null;
};

export function useActionButtons(
  options: UseActionButtonsOptions,
): UseActionButtonsResult {
  const { actions, onAction, onBeforeAction, confirmTimeout = 3000 } = options;

  const [confirmingActionId, setConfirmingActionId] = useState<string | null>(
    null,
  );
  const [executingActionId, setExecutingActionId] = useState<string | null>(
    null,
  );
  // Ref for synchronous double-click prevention (state updates are async)
  const isExecutingRef = useRef(false);

  useEffect(() => {
    if (!confirmingActionId) return;
    const id = setTimeout(() => setConfirmingActionId(null), confirmTimeout);
    return () => clearTimeout(id);
  }, [confirmingActionId, confirmTimeout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmingActionId) {
        setConfirmingActionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmingActionId]);

  const runAction = useCallback(
    async (actionId: string) => {
      const action = actions.find((a) => a.id === actionId);
      if (!action) return;

      // Use ref for synchronous check to prevent race conditions on rapid clicks
      if (action.disabled || action.loading || isExecutingRef.current) {
        return;
      }

      if (action.confirmLabel && confirmingActionId !== action.id) {
        setConfirmingActionId(action.id);
        return;
      }

      if (onBeforeAction) {
        const shouldProceed = await onBeforeAction(action.id);
        if (!shouldProceed) {
          setConfirmingActionId(null);
          return;
        }
      }

      try {
        // Set ref synchronously to prevent double-clicks
        isExecutingRef.current = true;
        setExecutingActionId(action.id);
        await onAction(action.id);
      } finally {
        isExecutingRef.current = false;
        setExecutingActionId(null);
        setConfirmingActionId(null);
      }
    },
    [actions, confirmingActionId, onAction, onBeforeAction],
  );

  const resolvedActions = useMemo(
    () =>
      actions.map((action) => {
        const isConfirming = confirmingActionId === action.id;
        const isExecuting = executingActionId === action.id;
        const isLoading = action.loading || isExecuting;
        const isDisabled =
          action.disabled || (executingActionId !== null && !isExecuting);
        const currentLabel =
          isConfirming && action.confirmLabel
            ? action.confirmLabel
            : action.label;

        return {
          ...action,
          currentLabel,
          isConfirming,
          isExecuting,
          isDisabled,
          isLoading,
        };
      }),
    [actions, confirmingActionId, executingActionId],
  );

  return {
    actions: resolvedActions,
    runAction,
    confirmingActionId,
    executingActionId,
  };
}
