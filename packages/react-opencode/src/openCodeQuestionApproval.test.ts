import { describe, expect, it } from "vitest";
import {
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
});
