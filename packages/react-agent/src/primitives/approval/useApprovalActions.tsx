"use client";

import { useCallback } from "react";
import { useApproval, useApprovalState } from "../../hooks";

export function useApprovalApprove() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  const callback = useCallback(() => approval?.approve("once"), [approval]);

  return approval && status === "pending" ? callback : null;
}

export function useApprovalApproveSession() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  const callback = useCallback(() => approval?.approve("session"), [approval]);

  return approval && status === "pending" ? callback : null;
}

export function useApprovalApproveAlways() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  const callback = useCallback(() => approval?.approve("always"), [approval]);

  return approval && status === "pending" ? callback : null;
}

export function useApprovalDeny() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  const callback = useCallback(() => approval?.deny(), [approval]);

  return approval && status === "pending" ? callback : null;
}
