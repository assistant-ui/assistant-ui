"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ApprovalProvider, useApproval, useApprovalState } from "../hooks";
import type { ApprovalStatus } from "../runtime";

export interface ApprovalRootProps {
  approvalId: string;
  children: ReactNode;
}

function ApprovalRoot({ approvalId, children }: ApprovalRootProps) {
  return (
    <ApprovalProvider approvalId={approvalId}>{children}</ApprovalProvider>
  );
}

ApprovalRoot.displayName = "ApprovalPrimitive.Root";

function ApprovalToolName(props: ComponentPropsWithoutRef<"span">) {
  const toolName = useApprovalState((s) => s.toolName);
  return <span {...props}>{toolName}</span>;
}

ApprovalToolName.displayName = "ApprovalPrimitive.ToolName";

function ApprovalReason(props: ComponentPropsWithoutRef<"span">) {
  const reason = useApprovalState((s) => s.reason);
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
  const formatted =
    format === "json" ? JSON.stringify(toolInput, null, 2) : String(toolInput);
  return <pre {...props}>{formatted}</pre>;
}

ApprovalToolInput.displayName = "ApprovalPrimitive.ToolInput";

function ApprovalApprove(props: ComponentPropsWithoutRef<"button">) {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  if (status !== "pending") {
    return null;
  }

  return (
    <button type="button" onClick={() => approval.approve()} {...props}>
      {props.children ?? "Approve"}
    </button>
  );
}

ApprovalApprove.displayName = "ApprovalPrimitive.Approve";

function ApprovalDeny(props: ComponentPropsWithoutRef<"button">) {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  if (status !== "pending") {
    return null;
  }

  return (
    <button type="button" onClick={() => approval.deny()} {...props}>
      {props.children ?? "Deny"}
    </button>
  );
}

ApprovalDeny.displayName = "ApprovalPrimitive.Deny";

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
  return (
    <span {...props}>
      {showIcon && `${statusIcons[status]} `}
      {status}
    </span>
  );
}

ApprovalStatusDisplay.displayName = "ApprovalPrimitive.Status";

export interface ApprovalIfProps {
  status: ApprovalStatus | ApprovalStatus[];
  children: ReactNode;
}

function ApprovalIf({ status, children }: ApprovalIfProps) {
  const currentStatus = useApprovalState((s) => s.status);
  const statuses = Array.isArray(status) ? status : [status];

  if (!statuses.includes(currentStatus)) {
    return null;
  }

  return <>{children}</>;
}

ApprovalIf.displayName = "ApprovalPrimitive.If";

export const ApprovalPrimitive = {
  Root: ApprovalRoot,
  ToolName: ApprovalToolName,
  Reason: ApprovalReason,
  ToolInput: ApprovalToolInput,
  Approve: ApprovalApprove,
  Deny: ApprovalDeny,
  Status: ApprovalStatusDisplay,
  If: ApprovalIf,
};
