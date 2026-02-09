"use client";

import React, {
  createContext,
  useContext,
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
  children: ReactNode;
}

function TaskLauncherRoot({ onSubmit, children }: TaskLauncherRootProps) {
  const workspace = useAgentWorkspace();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const value = useMemo(
    () => ({
      prompt,
      setPrompt,
      isSubmitting,
      submit: async () => {
        if (!prompt.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
          const task = await workspace.createTask(prompt);
          setPrompt("");
          onSubmit?.(task.id);
        } finally {
          setIsSubmitting(false);
        }
      },
    }),
    [prompt, isSubmitting, workspace, onSubmit],
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
    submit();
    onClick?.(e);
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
