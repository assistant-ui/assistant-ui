"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { usePlan, usePlanState } from "../hooks/usePlanState";
import type { PlanStatus } from "../runtime/types";

const PlanRoot = ({ children }: { children: ReactNode }) => {
  const plan = usePlan();
  if (!plan) return null;
  return <>{children}</>;
};

PlanRoot.displayName = "PlanPrimitive.Root";

const PlanContent = (props: ComponentPropsWithoutRef<"div">) => {
  const text = usePlanState((s) => s.text);
  if (text === null) return null;
  return <div {...props}>{text}</div>;
};

PlanContent.displayName = "PlanPrimitive.Content";

const PlanStatusDisplay = (props: ComponentPropsWithoutRef<"span">) => {
  const status = usePlanState((s) => s.status);
  if (!status) return null;
  return <span {...props}>{status}</span>;
};

PlanStatusDisplay.displayName = "PlanPrimitive.Status";

// biome-ignore lint/suspicious: this package supports React 18 and React 19
const PlanApprove = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button">
>(({ children, onClick, ...props }, ref) => {
  const plan = usePlan();
  const status = usePlanState((s) => s.status);

  if (!plan || status !== "proposed") return null;

  const handleClick: ComponentPropsWithoutRef<"button">["onClick"] = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    void plan.approve().catch((error: unknown) => {
      console.error("PlanPrimitive.Approve action failed:", error);
    });
  };

  return (
    <button ref={ref} type="button" onClick={handleClick} {...props}>
      {children ?? "Approve"}
    </button>
  );
});

PlanApprove.displayName = "PlanPrimitive.Approve";

// biome-ignore lint/suspicious: this package supports React 18 and React 19
const PlanReject = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { feedback?: string }
>(({ children, onClick, feedback, ...props }, ref) => {
  const plan = usePlan();
  const status = usePlanState((s) => s.status);

  if (!plan || status !== "proposed") return null;

  const handleClick: ComponentPropsWithoutRef<"button">["onClick"] = (e) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    void plan.reject(feedback).catch((error: unknown) => {
      console.error("PlanPrimitive.Reject action failed:", error);
    });
  };

  return (
    <button ref={ref} type="button" onClick={handleClick} {...props}>
      {children ?? "Reject"}
    </button>
  );
});

PlanReject.displayName = "PlanPrimitive.Reject";

export interface PlanIfProps {
  status: PlanStatus | PlanStatus[];
  children: ReactNode;
}

const PlanIf = ({ status, children }: PlanIfProps) => {
  const currentStatus = usePlanState((s) => s.status);
  if (!currentStatus) return null;
  const statuses = Array.isArray(status) ? status : [status];
  if (!statuses.includes(currentStatus)) return null;
  return <>{children}</>;
};

PlanIf.displayName = "PlanPrimitive.If";

export const PlanPrimitive = {
  Root: PlanRoot,
  Content: PlanContent,
  Status: PlanStatusDisplay,
  Approve: PlanApprove,
  Reject: PlanReject,
  If: PlanIf,
};
