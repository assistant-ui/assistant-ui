import { describe, expect, it, vi } from "vitest";

import {
  createToolApprovalStore,
  getToolApprovalStore,
} from "./toolApprovalStore";

describe("tool approval store", () => {
  it("keeps one response per identity and releases inactive responses", () => {
    const identity = {};
    const store = getToolApprovalStore(identity);
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.claim({ approvalId: "approval-1", approved: true })).toBe(
      true,
    );
    expect(store.claim({ approvalId: "approval-1", approved: false })).toBe(
      false,
    );
    expect(store.getSnapshot().get("approval-1")).toEqual({
      approvalId: "approval-1",
      approved: true,
    });

    store.reconcile(new Set(["approval-1"]));
    expect(store.getSnapshot()).toHaveLength(1);
    store.reconcile(new Set());
    expect(store.getSnapshot()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getToolApprovalStore(identity)).toBe(store);
  });

  it("releases a claimed response when the host delegates it", () => {
    const store = createToolApprovalStore();

    expect(store.claim({ approvalId: "approval-1", approved: true })).toBe(
      true,
    );
    store.release("approval-1");

    expect(store.getSnapshot()).toHaveLength(0);
    expect(store.claim({ approvalId: "approval-1", approved: false })).toBe(
      true,
    );
  });
});
