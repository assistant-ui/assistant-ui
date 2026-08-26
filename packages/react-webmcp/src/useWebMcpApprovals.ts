"use client";

import { useSyncExternalStore } from "react";
import {
  webMcpApprovalStore,
  type WebMcpPendingApproval,
} from "./approval-gate";

const EMPTY: readonly WebMcpPendingApproval[] = [];
const getServerSnapshot = () => EMPTY;

export const useWebMcpApprovals = (): readonly WebMcpPendingApproval[] =>
  useSyncExternalStore(
    webMcpApprovalStore.subscribe,
    webMcpApprovalStore.getSnapshot,
    getServerSnapshot,
  );
