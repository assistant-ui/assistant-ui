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

  it("resolves a free-form answer as approved and carries the text", () => {
    expect(
      resolveToolApprovalResponse(
        { id: "q1", display: "text" },
        { text: "staging" },
      ),
    ).toEqual({ approvalId: "q1", approved: true, text: "staging" });
  });

  it("carries the text alongside a chosen option", () => {
    expect(
      resolveToolApprovalResponse(
        {
          id: "q2",
          display: "select",
          allowFreeform: true,
          options: [{ id: "other", kind: "_other" }],
        },
        { optionId: "other", approved: true, text: "somewhere else" },
      ),
    ).toEqual({
      approvalId: "q2",
      approved: true,
      optionId: "other",
      text: "somewhere else",
    });
  });

  it("throws when the request does not accept a free-form answer", () => {
    expect(() =>
      resolveToolApprovalResponse(approval, { text: "anything" }),
    ).toThrow("does not accept a free-form answer");
    expect(() =>
      resolveToolApprovalResponse(
        { id: "a4", display: "select" },
        { approved: true, text: "anything" },
      ),
    ).toThrow("does not accept a free-form answer");
  });

  it("refuses to infer approval from a bare answer on a decision", () => {
    expect(() =>
      resolveToolApprovalResponse(
        { id: "a5", display: "decision", allowFreeform: true },
        { text: "not this one" },
      ),
    ).toThrow("is a decision, not a question");
    expect(() =>
      resolveToolApprovalResponse(
        { id: "a6", allowFreeform: true },
        { text: "not this one" },
      ),
    ).toThrow("is a decision, not a question");
  });

  it("records the answer alongside an explicit decision on a gate", () => {
    expect(
      resolveToolApprovalResponse(
        { id: "a7", display: "decision", allowFreeform: true },
        { approved: false, text: "not this one" },
      ),
    ).toEqual({ approvalId: "a7", approved: false, text: "not this one" });
  });

  it("keeps a refusal a refusal when the request accepts text", () => {
    expect(
      resolveToolApprovalResponse(
        { id: "q3", allowFreeform: true },
        { approved: false, reason: "not answering" },
      ),
    ).toEqual({ approvalId: "q3", approved: false, reason: "not answering" });
  });

  describe('display "questions"', () => {
    const questionnaire = {
      id: "q",
      display: "questions" as const,
      questions: [
        {
          id: "scope",
          prompt: "Which files?",
          options: [
            { id: "src", label: "src" },
            { id: "tests", label: "tests" },
          ],
          multiple: true,
        },
        {
          id: "style",
          prompt: "Which style?",
          options: [
            { id: "terse", label: "Terse" },
            { id: "verbose", label: "Verbose" },
          ],
          allowFreeform: true,
        },
        { id: "note", prompt: "Anything else?" },
      ],
    };

    it("resolves complete answers as approved and passes them through", () => {
      const answers = {
        scope: { optionIds: ["src", "tests"] },
        style: { text: "match the repo" },
        note: { text: "keep it short" },
      };
      expect(
        resolveToolApprovalResponse(questionnaire, { answers, reason: "ok" }),
      ).toEqual({ approvalId: "q", approved: true, answers, reason: "ok" });
    });

    it("resolves approved: false as a dismissal", () => {
      expect(
        resolveToolApprovalResponse(questionnaire, { approved: false }),
      ).toEqual({ approvalId: "q", approved: false });
    });

    it.each([
      {
        name: "a bare approval",
        response: { approved: true },
        error: "respond with answers",
      },
      {
        name: "an option id",
        response: { optionId: "src" },
        error: "respond with answers",
      },
      {
        name: "a bare text answer",
        response: { text: "src" },
        error: "respond with answers",
      },
      {
        name: "answers mixed with approved",
        response: {
          answers: { scope: { optionIds: ["src"] } },
          approved: true,
        },
        error: "takes its answers alone",
      },
    ])("rejects $name", ({ response, error }) => {
      expect(() =>
        resolveToolApprovalResponse(questionnaire, response as never),
      ).toThrow(error);
    });

    it.each([
      {
        name: "a missing question",
        answers: { scope: { optionIds: ["src"] }, style: { text: "x" } },
        error: 'missing an answer to question "note"',
      },
      {
        name: "an empty answer",
        answers: {
          scope: {},
          style: { optionIds: ["terse"] },
          note: { text: "x" },
        },
        error: 'missing an answer to question "scope"',
      },
      {
        name: "a blank typed answer",
        answers: {
          scope: { optionIds: ["src"] },
          style: { optionIds: ["terse"] },
          note: { text: "  " },
        },
        error: 'missing an answer to question "note"',
      },
      {
        name: "an unknown question",
        answers: {
          scope: { optionIds: ["src"] },
          style: { optionIds: ["terse"] },
          note: { text: "x" },
          extra: { text: "x" },
        },
        error: 'no question with id "extra"',
      },
      {
        name: "an option from outside the question",
        answers: {
          scope: { optionIds: ["terse"] },
          style: { optionIds: ["terse"] },
          note: { text: "x" },
        },
        error: 'no option with id "terse"',
      },
      {
        name: "an option repeated on a multiple-choice question",
        answers: {
          scope: { optionIds: ["src", "src"] },
          style: { optionIds: ["terse"] },
          note: { text: "x" },
        },
        error: "lists an option more than once",
      },
      {
        name: "two options on a single-choice question",
        answers: {
          scope: { optionIds: ["src"] },
          style: { optionIds: ["terse", "verbose"] },
          note: { text: "x" },
        },
        error: "takes one option, not 2",
      },
      {
        name: "a typed answer the question does not accept",
        answers: {
          scope: { optionIds: ["src"], text: "everything" },
          style: { optionIds: ["terse"] },
          note: { text: "x" },
        },
        error: "does not accept a typed answer",
      },
    ])("rejects $name", ({ answers, error }) => {
      expect(() =>
        resolveToolApprovalResponse(questionnaire, { answers }),
      ).toThrow(error);
    });

    it("rejects a request without questions or with a repeated question id", () => {
      expect(() =>
        resolveToolApprovalResponse(
          { id: "q", display: "questions" },
          { answers: {} },
        ),
      ).toThrow("declares no questions");
      expect(() =>
        resolveToolApprovalResponse(
          {
            id: "q",
            display: "questions",
            questions: [
              { id: "a", prompt: "A?" },
              { id: "a", prompt: "A again?" },
            ],
          },
          { answers: { a: { text: "x" } } },
        ),
      ).toThrow('declares question "a" more than once');
    });

    it("resolves questions whose ids name object prototype keys", () => {
      const answers = JSON.parse(
        '{"constructor":{"text":"a"},"__proto__":{"text":"b"}}',
      );
      expect(
        resolveToolApprovalResponse(
          {
            id: "q",
            display: "questions",
            questions: [
              { id: "constructor", prompt: "A?" },
              { id: "__proto__", prompt: "B?" },
            ],
          },
          { answers },
        ),
      ).toEqual({ approvalId: "q", approved: true, answers });
      expect(() =>
        resolveToolApprovalResponse(
          {
            id: "q",
            display: "questions",
            questions: [{ id: "constructor", prompt: "A?" }],
          },
          { answers: {} },
        ),
      ).toThrow('missing an answer to question "constructor"');
    });

    it("rejects answers on a request that asks no questions", () => {
      expect(() =>
        resolveToolApprovalResponse(approval, {
          answers: { scope: { text: "x" } },
        }),
      ).toThrow("asks no questions");
    });
  });
});
