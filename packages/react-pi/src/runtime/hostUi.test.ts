import { describe, expect, it } from "vitest";
import { resolveToolApprovalResponse } from "@assistant-ui/core/internal";
import type { ToolApprovalResponse } from "@assistant-ui/react";
import {
  approvalForRequest,
  responseForApproval,
  responseForInterrupt,
  responseForRequest,
  responseForToolApproval,
  splitHostUiRequests,
} from "./hostUi";
import type { PiHostUiRequest } from "../types";

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

const select = (id: string): PiHostUiRequest => ({
  id,
  kind: "select",
  title: "Deploy where?",
  options: ["staging", "production"],
});

const editor = (id: string): PiHostUiRequest => ({
  id,
  kind: "editor",
  title: "Edit the plan",
  prefill: "step one",
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

  it("keeps requests the tool call's approval cannot answer on the side channel", () => {
    const unknownKind = {
      id: "u",
      kind: "multiselect",
      title: "Pick any",
      toolCallId: "tc1",
    } as unknown as PiHostUiRequest;
    const noChoices: PiHostUiRequest = {
      id: "e",
      kind: "select",
      title: "Pick one",
      options: [],
      toolCallId: "tc2",
    };
    const { toolAssociated, freeStanding } = splitHostUiRequests([
      unknownKind,
      noChoices,
    ]);
    expect(toolAssociated.size).toBe(0);
    expect(freeStanding.map((r) => r.id)).toEqual(["u", "e"]);
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

describe("approvalForRequest", () => {
  it("asks a confirm request as a decision under its title and message", () => {
    expect(approvalForRequest(confirm("r1"))).toEqual({
      id: "r1",
      prompt: "Run?\nok?",
    });
  });

  it("offers one option per select choice, keyed by the choice index", () => {
    expect(approvalForRequest(select("r2"))).toEqual({
      id: "r2",
      prompt: "Deploy where?",
      display: "select",
      options: [
        { id: "0", kind: "_0", label: "staging" },
        { id: "1", kind: "_1", label: "production" },
      ],
    });
  });

  it("has no approval for a select without choices", () => {
    expect(
      approvalForRequest({ ...select("r2"), options: [] } as PiHostUiRequest),
    ).toBeUndefined();
  });

  it("asks input and editor requests for a text answer", () => {
    expect(approvalForRequest(input("r3"))).toEqual({
      id: "r3",
      prompt: "Name?",
      display: "text",
    });
    expect(approvalForRequest(editor("r4"))).toEqual({
      id: "r4",
      prompt: "Edit the plan",
      display: "text",
    });
  });
});

describe("responseForToolApproval", () => {
  it("answers a confirm request with the decision", () => {
    expect(
      responseForToolApproval(confirm("r1"), {
        approvalId: "r1",
        approved: false,
      }),
    ).toEqual({ requestId: "r1", confirmed: false });
  });

  it("answers a select request with the chosen choice", () => {
    expect(
      responseForToolApproval(select("r2"), {
        approvalId: "r2",
        approved: true,
        optionId: "1",
      }),
    ).toEqual({ requestId: "r2", value: "production" });
  });

  it("answers input and editor requests with the text, empty included", () => {
    expect(
      responseForToolApproval(input("r3"), {
        approvalId: "r3",
        approved: true,
        text: "Ada",
      }),
    ).toEqual({ requestId: "r3", value: "Ada" });
    expect(
      responseForToolApproval(editor("r4"), {
        approvalId: "r4",
        approved: true,
        text: "",
      }),
    ).toEqual({ requestId: "r4", value: "" });
  });

  it("dismisses a select, input or editor request on a refusal", () => {
    for (const request of [select("r2"), input("r3"), editor("r4")]) {
      expect(
        responseForToolApproval(request, {
          approvalId: request.id,
          approved: false,
          optionId: "0",
          text: "ignored",
        }),
      ).toEqual({ requestId: request.id, dismissed: true });
    }
  });

  it("rejects an acceptance that carries no answer", () => {
    expect(() =>
      responseForToolApproval(select("r2"), {
        approvalId: "r2",
        approved: true,
      }),
    ).toThrow(
      'Pi select request "r2" was not answered with one of its options',
    );
    expect(() =>
      responseForToolApproval(select("r2"), {
        approvalId: "r2",
        approved: true,
        optionId: "2",
      }),
    ).toThrow(
      'Pi select request "r2" was not answered with one of its options',
    );
    expect(() =>
      responseForToolApproval(editor("r4"), {
        approvalId: "r4",
        approved: true,
      }),
    ).toThrow('Pi editor request "r4" was not answered with text');
  });

  it("turns the tool fallback's answers into the values Pi reads", () => {
    const answer = (request: PiHostUiRequest, response: ToolApprovalResponse) =>
      responseForToolApproval(
        request,
        resolveToolApprovalResponse(approvalForRequest(request)!, response),
      );

    expect(answer(confirm("r1"), { approved: true })).toEqual({
      requestId: "r1",
      confirmed: true,
    });
    expect(answer(select("r2"), { optionId: "0", approved: true })).toEqual({
      requestId: "r2",
      value: "staging",
    });
    expect(answer(input("r3"), { text: "Ada" })).toEqual({
      requestId: "r3",
      value: "Ada",
    });
  });
});
