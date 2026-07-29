import { describe, expect, it } from "vitest";
import {
  projectOpenCodePermissionApproval,
  projectResolvedOpenCodePermissionApproval,
  toOpenCodePermissionResponse,
} from "./openCodePermissionApproval";
import type { OpenCodePermissionRequest } from "./types";

const request: OpenCodePermissionRequest = {
  id: "permission-1",
  sessionId: "session-1",
  permission: "bash",
  patterns: ["git status"],
  metadata: {},
  always: ["git *"],
  tool: {
    messageID: "message-1",
    callID: "call-1",
  },
  askedAt: 1,
  raw: {} as never,
};

describe("OpenCode permission approvals", () => {
  it("projects OpenCode replies as standard approval options", () => {
    expect(projectOpenCodePermissionApproval(request)).toEqual({
      id: "permission-1",
      options: [
        {
          id: "once",
          kind: "allow-once",
        },
        {
          id: "always",
          kind: "allow-always",
          description: "Allow these patterns until OpenCode is restarted.",
          grants: ["git *"],
          confirm: true,
        },
        {
          id: "reject",
          kind: "reject-once",
        },
      ],
    });
  });

  it("omits the always option when the request grants nothing", () => {
    expect(
      projectOpenCodePermissionApproval({ ...request, always: [] }).options,
    ).toEqual([
      { id: "once", kind: "allow-once" },
      { id: "reject", kind: "reject-once" },
    ]);
  });

  it("projects resolved replies with the recorded decision", () => {
    expect(
      projectResolvedOpenCodePermissionApproval({ request, reply: "always" }),
    ).toEqual({ id: "permission-1", approved: true, optionId: "always" });
    expect(
      projectResolvedOpenCodePermissionApproval({ request, reply: "reject" }),
    ).toEqual({ id: "permission-1", approved: false, optionId: "reject" });
  });

  it.each([
    [{ approvalId: "p", approved: true }, "once"],
    [{ approvalId: "p", approved: false }, "reject"],
    [{ approvalId: "p", approved: true, optionId: "once" }, "once"],
    [{ approvalId: "p", approved: true, optionId: "always" }, "always"],
    [{ approvalId: "p", approved: false, optionId: "reject" }, "reject"],
  ] as const)("maps the standard decision %o to %s", (response, expected) => {
    expect(toOpenCodePermissionResponse(response)).toBe(expected);
  });

  it.each([
    { approvalId: "p", approved: false, optionId: "once" },
    { approvalId: "p", approved: false, optionId: "always" },
    { approvalId: "p", approved: true, optionId: "reject" },
    { approvalId: "p", approved: true, optionId: "unknown" },
  ])("rejects an invalid standard decision %o", (response) => {
    expect(() => toOpenCodePermissionResponse(response)).toThrow();
  });
});
