import { describe, expect, it } from "vitest";
import {
  responseForApproval,
  responseForInterrupt,
  responseForRequest,
  splitHostUiRequests,
} from "./piHostUi";
import type { PiHostUiRequest } from "./piTypes";

const confirm = (id: string, toolCallId?: string): PiHostUiRequest => ({
  id,
  kind: "confirm",
  title: "Run?",
  message: "ok?",
  ...(toolCallId !== undefined ? { toolCallId } : {}),
});

const input = (id: string, toolCallId?: string): PiHostUiRequest => ({
  id,
  kind: "input",
  title: "Name?",
  ...(toolCallId !== undefined ? { toolCallId } : {}),
});

describe("splitHostUiRequests", () => {
  it("routes requests with a toolCallId to tool-associated, others to side channel", () => {
    const { toolAssociated, freeStanding } = splitHostUiRequests([
      confirm("a", "tc1"),
      confirm("b"),
      input("c", "tc2"),
    ]);
    expect([...toolAssociated.keys()]).toEqual(["tc1", "tc2"]);
    expect(toolAssociated.get("tc1")!.id).toBe("a");
    expect(freeStanding.map((r) => r.id)).toEqual(["b"]);
  });

  it("keeps the first request for a duplicated toolCallId and sidelines the rest", () => {
    const { toolAssociated, freeStanding } = splitHostUiRequests([
      confirm("first", "tc1"),
      confirm("second", "tc1"),
    ]);
    expect(toolAssociated.get("tc1")!.id).toBe("first");
    expect(freeStanding.map((r) => r.id)).toEqual(["second"]);
  });

  it("returns empty partitions for no requests", () => {
    const { toolAssociated, freeStanding } = splitHostUiRequests([]);
    expect(toolAssociated.size).toBe(0);
    expect(freeStanding).toEqual([]);
  });
});

describe("responseForApproval", () => {
  it("maps approved to confirmed:true", () => {
    expect(responseForApproval("r1", true)).toEqual({
      requestId: "r1",
      confirmed: true,
    });
  });

  it("maps denial/cancel to confirmed:false (no separate cancelled channel)", () => {
    expect(responseForApproval("r1", false)).toEqual({
      requestId: "r1",
      confirmed: false,
    });
  });
});

describe("responseForInterrupt", () => {
  it("maps a bare string to a chosen value", () => {
    expect(responseForInterrupt("r2", "hello")).toEqual({
      requestId: "r2",
      value: "hello",
    });
  });

  it("maps an object value to a chosen value", () => {
    expect(responseForInterrupt("r2", { value: "world" })).toEqual({
      requestId: "r2",
      value: "world",
    });
  });

  it("maps undefined/null/dismissed to a dismissal", () => {
    expect(responseForInterrupt("r2", undefined)).toEqual({
      requestId: "r2",
      dismissed: true,
    });
    expect(responseForInterrupt("r2", null)).toEqual({
      requestId: "r2",
      dismissed: true,
    });
    expect(responseForInterrupt("r2", { dismissed: true })).toEqual({
      requestId: "r2",
      dismissed: true,
    });
    expect(responseForInterrupt("r2", { value: null })).toEqual({
      requestId: "r2",
      dismissed: true,
    });
  });

  it("treats an empty string as a real chosen value", () => {
    expect(responseForInterrupt("r2", "")).toEqual({
      requestId: "r2",
      value: "",
    });
  });
});

describe("responseForRequest", () => {
  it("dispatches confirm to an approval response", () => {
    expect(responseForRequest(confirm("r1"), true)).toEqual({
      requestId: "r1",
      confirmed: true,
    });
  });

  it("dispatches input to an interrupt response", () => {
    expect(responseForRequest(input("r2"), "value")).toEqual({
      requestId: "r2",
      value: "value",
    });
  });
});
