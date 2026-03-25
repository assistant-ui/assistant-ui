"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import { useAgentWorkspace } from "../../hooks/useAgentWorkspace";

interface TaskLauncherContextValue {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isSubmitting: boolean;
  submit: () => Promise<void>;
}

const TaskLauncherContext = createContext<TaskLauncherContextValue | null>(
  null,
);

export function useTaskLauncher() {
  const ctx = useContext(TaskLauncherContext);
  if (!ctx) {
    throw new Error(
      "useTaskLauncher must be used within TaskLauncherPrimitive.Root",
    );
  }
  return ctx;
}

export interface TaskLauncherRootProps {
  onSubmit?: (taskId: string) => void;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

function TaskLauncherRoot({
  onSubmit,
  onError,
  children,
}: TaskLauncherRootProps) {
  const workspace = useAgentWorkspace();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const task = await workspace.createTask(trimmedPrompt);
      setPrompt("");
      onSubmit?.(task.id);
    } catch (error) {
      onError?.(error);
      if (!onError) {
        console.error("TaskLauncher submit failed:", error);
      }
      throw error;
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [prompt, workspace, onSubmit, onError]);

  const value = useMemo(
    () => ({
      prompt,
      setPrompt,
      isSubmitting,
      submit,
    }),
    [prompt, isSubmitting, submit],
  );

  return (
    <TaskLauncherContext.Provider value={value}>
      {children}
    </TaskLauncherContext.Provider>
  );
}

TaskLauncherRoot.displayName = "TaskLauncherPrimitive.Root";

export interface TaskLauncherInputProps
  extends Omit<ComponentPropsWithoutRef<"textarea">, "value" | "onChange"> {
  placeholder?: string;
}

function TaskLauncherInput({
  placeholder = "Describe your task...",
  ...props
}: TaskLauncherInputProps) {
  const { prompt, setPrompt, isSubmitting } = useTaskLauncher();

  return (
    <textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      disabled={isSubmitting}
      placeholder={placeholder}
      {...props}
    />
  );
}

TaskLauncherInput.displayName = "TaskLauncherPrimitive.Input";

function TaskLauncherSubmit({
  children,
  disabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { prompt, isSubmitting, submit } = useTaskLauncher();
  const isDisabled = disabled || !prompt.trim() || isSubmitting;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    void submit().catch(() => {});
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {children ?? (isSubmitting ? "Launching..." : "Launch")}
    </button>
  );
}

TaskLauncherSubmit.displayName = "TaskLauncherPrimitive.Submit";

export const TaskLauncherPrimitive = {
  Root: TaskLauncherRoot,
  Input: TaskLauncherInput,
  Submit: TaskLauncherSubmit,
};
