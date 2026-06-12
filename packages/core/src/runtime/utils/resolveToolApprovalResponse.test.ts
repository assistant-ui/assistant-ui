import { describe, expect, it } from "vitest";
import { resolveToolApprovalResponse } from "./resolveToolApprovalResponse";

const approval = {
  id: "a1",
  options: [
    { id: "once", kind: "allow-once" as const },
    { id: "always", kind: "allow-always" as const, grants: ["git *"] },
    { id: "deny", kind: "reject-once" as const },
    { id: "never", kind: "reject-always" as const },
    { id: "edit", kind: "_modify" },
  ],
};

describe("resolveToolApprovalResponse", () => {
  it("passes through boolean responses", () => {
    expect(resolveToolApprovalResponse(approval, { approved: true })).toEqual({
      approvalId: "a1",
      approved: true,
    });
    expect(
      resolveToolApprovalResponse(approval, {
        approved: false,
        reason: "nope",
      }),
    ).toEqual({ approvalId: "a1", approved: false, reason: "nope" });
  });

  it("resolves allow kinds to approved: true", () => {
    expect(resolveToolApprovalResponse(approval, { optionId: "once" })).toEqual(
      { approvalId: "a1", approved: true, optionId: "once" },
    );
    expect(
      resolveToolApprovalResponse(approval, { optionId: "always" }),
    ).toEqual({ approvalId: "a1", approved: true, optionId: "always" });
  });

  it("resolves reject kinds to approved: false and keeps the reason", () => {
    expect(
      resolveToolApprovalResponse(approval, {
        optionId: "deny",
        reason: "not now",
      }),
    ).toEqual({
      approvalId: "a1",
      approved: false,
      optionId: "deny",
      reason: "not now",
    });
    expect(
      resolveToolApprovalResponse(approval, { optionId: "never" }),
    ).toEqual({ approvalId: "a1", approved: false, optionId: "never" });
  });

  it("throws for an unknown option id", () => {
    expect(() =>
      resolveToolApprovalResponse(approval, { optionId: "missing" }),
    ).toThrow('no option with id "missing"');
  });

  it("throws for custom kinds instead of guessing a boolean", () => {
    expect(() =>
      resolveToolApprovalResponse(approval, { optionId: "edit" }),
    ).toThrow('custom kind "_modify"');
  });

  it("accepts an explicit approved alongside the optionId for custom kinds", () => {
    expect(
      resolveToolApprovalResponse(approval, {
        optionId: "edit",
        approved: true,
      }),
    ).toEqual({ approvalId: "a1", approved: true, optionId: "edit" });
  });

  it("does not resolve kinds named after Object.prototype members", () => {
    const trap = {
      id: "a3",
      options: [{ id: "x", kind: "constructor" }],
    };
    expect(() => resolveToolApprovalResponse(trap, { optionId: "x" })).toThrow(
      'custom kind "constructor"',
    );
  });

  it("throws for option responses when the approval has no options", () => {
    expect(() =>
      resolveToolApprovalResponse({ id: "a2" }, { optionId: "once" }),
    ).toThrow('no option with id "once"');
  });
});
