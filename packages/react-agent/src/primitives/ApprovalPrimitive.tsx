"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ApprovalProvider, useApproval, useApprovalState } from "../hooks";
import type { ApprovalStatus } from "../runtime";
import { createActionButton } from "../actions/createActionButton";
import {
  useApprovalApprove,
  useApprovalApproveSession,
  useApprovalApproveAlways,
  useApprovalDeny,
} from "./approval/useApprovalActions";

export interface ApprovalPrimitiveRootProps {
  approvalId: string;
  children: ReactNode;
}

function ApprovalRoot({ approvalId, children }: ApprovalPrimitiveRootProps) {
  return (
    <ApprovalProvider approvalId={approvalId}>{children}</ApprovalProvider>
  );
}

ApprovalRoot.displayName = "ApprovalPrimitive.Root";

function ApprovalToolName(props: ComponentPropsWithoutRef<"span">) {
  const toolName = useApprovalState((s) => s.toolName);
  if (toolName === null) return null;
  return <span {...props}>{toolName}</span>;
}

ApprovalToolName.displayName = "ApprovalPrimitive.ToolName";

function ApprovalReason(props: ComponentPropsWithoutRef<"span">) {
  const reason = useApprovalState((s) => s.reason);
  if (reason === null) return null;
  return <span {...props}>{reason}</span>;
}

ApprovalReason.displayName = "ApprovalPrimitive.Reason";

export interface ApprovalToolInputProps
  extends ComponentPropsWithoutRef<"pre"> {
  format?: "json" | "raw";
}

function ApprovalToolInput({
  format = "json",
  ...props
}: ApprovalToolInputProps) {
  const toolInput = useApprovalState((s) => s.toolInput);
  if (toolInput === null) return null;
  const formatted =
    format === "json" ? JSON.stringify(toolInput, null, 2) : String(toolInput);
  return <pre {...props}>{formatted}</pre>;
}

ApprovalToolInput.displayName = "ApprovalPrimitive.ToolInput";

export interface ApprovalStatusDisplayProps
  extends ComponentPropsWithoutRef<"span"> {
  showIcon?: boolean;
}

const statusIcons: Record<ApprovalStatus, string> = {
  pending: "\u23F3",
  approved: "\u2705",
  denied: "\u274C",
};

function ApprovalStatusDisplay({
  showIcon = true,
  ...props
}: ApprovalStatusDisplayProps) {
  const status = useApprovalState((s) => s.status);
  if (!status) return null;
  return (
    <span {...props}>
      {showIcon && `${statusIcons[status]} `}
      {status}
    </span>
  );
}

ApprovalStatusDisplay.displayName = "ApprovalPrimitive.Status";

export interface ApprovalPrimitiveIfProps {
  status: ApprovalStatus | ApprovalStatus[];
  children: ReactNode;
}

function ApprovalIf({ status, children }: ApprovalPrimitiveIfProps) {
  const currentStatus = useApprovalState((s) => s.status);
  if (!currentStatus) return null;

  const statuses = Array.isArray(status) ? status : [status];

  if (!statuses.includes(currentStatus)) {
    return null;
  }

  return <>{children}</>;
}

ApprovalIf.displayName = "ApprovalPrimitive.If";

const ApprovalApprove = createActionButton(
  "ApprovalPrimitive.Approve",
  useApprovalApprove,
);

const ApprovalApproveSession = createActionButton(
  "ApprovalPrimitive.ApproveSession",
  useApprovalApproveSession,
);

const ApprovalApproveAlways = createActionButton(
  "ApprovalPrimitive.ApproveAlways",
  useApprovalApproveAlways,
);

const ApprovalDeny = createActionButton(
  "ApprovalPrimitive.Deny",
  useApprovalDeny,
);

export interface ApprovalApproveTimedProps
  extends ComponentPropsWithoutRef<"button"> {
  duration?: number;
}

function ApprovalApproveTimed({
  duration = 300000,
  children,
  ...props
}: ApprovalApproveTimedProps) {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  if (!approval || status !== "pending") return null;

  return (
    <button
      type="button"
      onClick={() => approval.approve("timed", duration)}
      {...props}
    >
      {children ?? `Allow for ${duration / 60000} min`}
    </button>
  );
}

ApprovalApproveTimed.displayName = "ApprovalPrimitive.ApproveTimed";

export interface ApprovalDenyWithReasonProps
  extends ComponentPropsWithoutRef<"button"> {}

function ApprovalDenyWithReason({
  children,
  ...props
}: ApprovalDenyWithReasonProps) {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  if (!approval || status !== "pending") return null;

  return (
    <button type="button" onClick={() => approval.deny()} {...props}>
      {children ?? "Deny"}
    </button>
  );
}

ApprovalDenyWithReason.displayName = "ApprovalPrimitive.DenyWithReason";

export const ApprovalPrimitive = {
  Root: ApprovalRoot,
  ToolName: ApprovalToolName,
  Reason: ApprovalReason,
  ToolInput: ApprovalToolInput,
  Status: ApprovalStatusDisplay,
  If: ApprovalIf,
  Approve: ApprovalApprove,
  ApproveSession: ApprovalApproveSession,
  ApproveAlways: ApprovalApproveAlways,
  ApproveTimed: ApprovalApproveTimed,
  Deny: ApprovalDeny,
  DenyWithReason: ApprovalDenyWithReason,
};
