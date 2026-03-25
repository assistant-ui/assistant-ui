"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { UserInputRuntime, UserInputState } from "../runtime";
import { useTask } from "./useTaskState";

const UserInputContext = createContext<string | null>(null);

export interface UserInputProviderProps {
  requestId: string;
  children: ReactNode;
}

export function UserInputProvider({
  requestId,
  children,
}: UserInputProviderProps) {
  return (
    <UserInputContext.Provider value={requestId}>
      {children}
    </UserInputContext.Provider>
  );
}

export function useUserInputId(): string {
  const requestId = useContext(UserInputContext);
  if (!requestId) {
    throw new Error("useUserInputId must be used within a UserInputProvider");
  }
  return requestId;
}

export function useUserInput(): UserInputRuntime | null {
  const task = useTask();
  const requestId = useUserInputId();
  const userInput = task.getUserInput(requestId);
  return userInput ?? null;
}

const EMPTY_SUBSCRIBE = (_cb: () => void) => () => {};

export function useUserInputState<T>(
  selector: (state: UserInputState) => T,
): T | null {
  const task = useTask();
  const requestId = useUserInputId();

  const subscribe = useCallback(
    (callback: () => void) => {
      let inputUnsubscribe =
        task.getUserInput(requestId)?.subscribe(callback) ??
        EMPTY_SUBSCRIBE(callback);
      const taskUnsubscribe = task.subscribe(() => {
        inputUnsubscribe();
        inputUnsubscribe =
          task.getUserInput(requestId)?.subscribe(callback) ??
          EMPTY_SUBSCRIBE(callback);
        callback();
      });

      return () => {
        inputUnsubscribe();
        taskUnsubscribe();
      };
    },
    [task, requestId],
  );

  const getSnapshot = useCallback(() => {
    return task.getUserInput(requestId)?.getState() ?? null;
  }, [task, requestId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return state ? selector(state) : null;
}
