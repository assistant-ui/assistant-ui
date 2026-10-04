import { describe, expect, it } from "vitest";
import {
  isProjectableOpenCodeQuestion,
  projectAnsweredOpenCodeQuestionApproval,
  projectOpenCodeQuestionApproval,
  projectRejectedOpenCodeQuestionApproval,
  toOpenCodeQuestionAnswers,
} from "./openCodeQuestionApproval";
import type { OpenCodeQuestionRequest } from "./types";

const request: OpenCodeQuestionRequest = {
  id: "question-1",
  sessionID: "session-1",
  tool: { messageID: "message-1", callID: "call-1" },
  askedAt: 1,
  questions: [
    {
      question: "Which files?",
      header: "Files",
      options: [
        { label: "All", description: "Every file" },
        { label: "Changed", description: "" },
      ],
      multiple: true,
      custom: false,
    },
    {
      question: "Any notes?",
      header: "",
      options: [],
    },
  ],
};

describe("OpenCode question approvals", () => {
  it("projects questions with options, headers, and freeform rules", () => {
    expect(projectOpenCodeQuestionApproval(request)).toEqual({
      id: "question-1",
      display: "questions",
      dismissible: true,
      questions: [
        {
          id: "0",
          prompt: "Which files?",
          header: "Files",
          options: [
            { id: "All", label: "All", description: "Every file" },
            { id: "Changed", label: "Changed" },
          ],
          multiple: true,
        },
        { id: "1", prompt: "Any notes?", allowFreeform: true },
      ],
    });
  });

  it("projects answered option labels and custom text by question", () => {
    expect(
      projectAnsweredOpenCodeQuestionApproval({
        request,
        answers: [["Changed", "later", " ", "All", "soon"], ["  "]],
      }),
    ).toEqual({
      ...projectOpenCodeQuestionApproval(request),
      approved: true,
      answers: { "0": { optionIds: ["Changed", "All"], text: "later, soon" } },
    });
  });

  it("projects rejection as a settled approval", () => {
    expect(projectRejectedOpenCodeQuestionApproval({ request })).toEqual({
      ...projectOpenCodeQuestionApproval(request),
      approved: false,
    });
  });

  it("converts answers in question order and omits blank text", () => {
    expect(
      toOpenCodeQuestionAnswers(request, {
        "1": { text: "details" },
        "0": { optionIds: ["Changed", "All"], text: "  " },
      }),
    ).toEqual([["Changed", "All"], ["details"]]);
    expect(toOpenCodeQuestionAnswers(request, {})).toEqual([[], []]);
  });

  it("skips a request without questions and tolerates a question without options", () => {
    const empty = {
      id: "question-2",
      sessionID: "session-1",
    } as unknown as OpenCodeQuestionRequest;
    const noOptions = {
      id: "question-3",
      sessionID: "session-1",
      questions: [{ question: "Why?", header: "" }],
    } as unknown as OpenCodeQuestionRequest;

    expect(isProjectableOpenCodeQuestion(empty)).toBe(false);
    expect(isProjectableOpenCodeQuestion(noOptions)).toBe(true);
    expect(projectOpenCodeQuestionApproval(noOptions).questions).toEqual([
      { id: "0", prompt: "Why?", allowFreeform: true },
    ]);
    expect(
      projectAnsweredOpenCodeQuestionApproval({
        request: noOptions,
        answers: [["because"]],
      }).answers,
    ).toEqual({ "0": { text: "because" } });
    expect(
      toOpenCodeQuestionAnswers(noOptions, { "0": { text: "because" } }),
    ).toEqual([["because"]]);
  });
});
