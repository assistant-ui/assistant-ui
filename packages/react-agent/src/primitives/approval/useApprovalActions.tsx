"use client";

import { useCallback } from "react";
import { useApproval, useApprovalState } from "../../hooks";

export function useApprovalApprove() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return approval && status === "pending"
    ? useCallback(() => approval.approve("once"), [approval])
    : null;
}

export function useApprovalApproveSession() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return approval && status === "pending"
    ? useCallback(() => approval.approve("session"), [approval])
    : null;
}

export function useApprovalApproveAlways() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return approval && status === "pending"
    ? useCallback(() => approval.approve("always"), [approval])
    : null;
}

export function useApprovalDeny() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return approval && status === "pending"
    ? useCallback(() => approval.deny(), [approval])
    : null;
}
