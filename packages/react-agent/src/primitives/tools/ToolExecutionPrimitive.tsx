"use client";

import {
  createContext,
  useContext,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import { createActionButton } from "../../actions/createActionButton";
import type { ToolExecution } from "./types";

const ToolExecutionContext = createContext<ToolExecution | null>(null);

function useToolExecution() {
  const ctx = useContext(ToolExecutionContext);
  if (!ctx) {
    throw new Error(
      "useToolExecution must be used within ToolExecutionPrimitive.Root",
    );
  }
  return ctx;
}

export interface ToolExecutionRootProps {
  execution: ToolExecution;
  children: ReactNode;
}

function ToolExecutionRoot({ execution, children }: ToolExecutionRootProps) {
  return (
    <ToolExecutionContext.Provider value={execution}>
      {children}
    </ToolExecutionContext.Provider>
  );
}

ToolExecutionRoot.displayName = "ToolExecutionPrimitive.Root";

export interface ToolExecutionNameProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (name: string) => ReactNode;
}

function ToolExecutionName({ children, ...props }: ToolExecutionNameProps) {
  const { toolName } = useToolExecution();

  return (
    <span {...props}>
      {typeof children === "function" ? children(toolName) : toolName}
    </span>
  );
}

ToolExecutionName.displayName = "ToolExecutionPrimitive.Name";

export interface ToolExecutionInputProps
  extends Omit<ComponentPropsWithoutRef<"pre">, "children"> {
  format?: "json" | "raw";
  children?: (input: unknown) => ReactNode;
}

function ToolExecutionInput({
  format = "json",
  children,
  ...props
}: ToolExecutionInputProps) {
  const { input } = useToolExecution();

  const content =
    typeof children === "function"
      ? children(input)
      : format === "json"
        ? JSON.stringify(input, null, 2)
        : String(input);

  return <pre {...props}>{content}</pre>;
}

ToolExecutionInput.displayName = "ToolExecutionPrimitive.Input";

export interface ToolExecutionOutputProps
  extends Omit<ComponentPropsWithoutRef<"pre">, "children"> {
  format?: "json" | "raw";
  children?: (output: unknown) => ReactNode;
}

function ToolExecutionOutput({
  format = "json",
  children,
  ...props
}: ToolExecutionOutputProps) {
  const { output, status } = useToolExecution();

  // Use status to determine visibility: only hide when tool hasn't completed yet
  if (status === "pending" || status === "running") return null;

  const content =
    typeof children === "function"
      ? children(output)
      : format === "json"
        ? JSON.stringify(output, null, 2)
        : String(output);

  return <pre {...props}>{content}</pre>;
}

ToolExecutionOutput.displayName = "ToolExecutionPrimitive.Output";

export interface ToolExecutionStatusProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (status: string) => ReactNode;
}

function ToolExecutionStatus({ children, ...props }: ToolExecutionStatusProps) {
  const { status } = useToolExecution();

  return (
    <span {...props}>
      {typeof children === "function" ? children(status) : status}
    </span>
  );
}

ToolExecutionStatus.displayName = "ToolExecutionPrimitive.Status";

export interface ToolExecutionDurationProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (duration: number) => ReactNode;
}

function ToolExecutionDuration({
  children,
  ...props
}: ToolExecutionDurationProps) {
  const { duration } = useToolExecution();

  if (duration === null) return null;

  const formatted = (duration / 1000).toFixed(2);

  return (
    <span {...props}>
      {typeof children === "function" ? children(duration) : `${formatted}s`}
    </span>
  );
}

ToolExecutionDuration.displayName = "ToolExecutionPrimitive.Duration";

// Copy action hooks
function useCopyInput() {
  const { input } = useToolExecution();

  return () => {
    const text = JSON.stringify(input, null, 2);
    navigator.clipboard.writeText(text);
  };
}

function useCopyOutput() {
  const { output, status } = useToolExecution();

  if (status === "pending" || status === "running") return null;

  return () => {
    const text = JSON.stringify(output, null, 2);
    navigator.clipboard.writeText(text);
  };
}

const CopyInput = createActionButton(
  "ToolExecutionPrimitive.CopyInput",
  useCopyInput,
);

const CopyOutput = createActionButton(
  "ToolExecutionPrimitive.CopyOutput",
  useCopyOutput,
);

export const ToolExecutionPrimitive = {
  Root: ToolExecutionRoot,
  Name: ToolExecutionName,
  Input: ToolExecutionInput,
  Output: ToolExecutionOutput,
  Status: ToolExecutionStatus,
  Duration: ToolExecutionDuration,
  CopyInput,
  CopyOutput,
};
