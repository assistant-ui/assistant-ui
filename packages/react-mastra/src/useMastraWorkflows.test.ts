import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMastraWorkflows } from "./useMastraWorkflows";

describe("useMastraWorkflows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts and resumes workflow runs through configured endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          runId: "run-1",
          status: "suspended",
          suspended: ["screening-step"],
          result: { score: 82 },
        }),
      )
      .mockResolvedValueOnce(
        new Response("data: [DONE]\n\n", {
          headers: { "Content-Type": "text/event-stream" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          runId: "run-1",
          status: "success",
          current: "interview-step",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useMastraWorkflows({
        workflowId: "hiringWorkflow",
        apiUrl: "/workflow",
      }),
    );

    await act(async () => {
      await result.current.startWorkflow({ candidateName: "Ada" });
    });

    expect(result.current.workflowState).toMatchObject({
      id: "run-1",
      current: "screening-step",
      status: "suspended",
      suspendData: { score: 82 },
    });

    await act(async () => {
      await result.current.resumeWorkflow({ approved: true });
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/workflow/resume",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.workflowState).toMatchObject({
      id: "run-1",
      current: "interview-step",
      status: "completed",
    });
  });

  it("parses nested Mastra suspend payloads and resumes the current step", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          runId: "run-2",
          status: "suspended",
          result: {
            status: "suspended",
            suspended: [["screening-step"]],
            suspendPayload: {
              "screening-step": {
                candidateName: "Ada",
                screeningScore: 9,
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response("data: [DONE]\n\n", {
          headers: { "Content-Type": "text/event-stream" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          runId: "run-2",
          status: "suspended",
          result: {
            status: "suspended",
            suspended: [["interview-step"]],
            suspendPayload: {
              "interview-step": {
                candidateName: "Ada",
                recommendation: "hire",
              },
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useMastraWorkflows({
        workflowId: "hiringWorkflow",
        apiUrl: "/workflow",
      }),
    );

    await act(async () => {
      await result.current.startWorkflow({ candidateName: "Ada" });
    });

    expect(result.current.workflowState).toMatchObject({
      id: "run-2",
      current: "screening-step",
      status: "suspended",
      suspendData: {
        candidateName: "Ada",
        screeningScore: 9,
      },
    });

    await act(async () => {
      await result.current.resumeWorkflow({ approved: true });
    });

    expect(
      JSON.parse(fetchMock.mock.calls[2]![1]!.body as string),
    ).toMatchObject({
      runId: "run-2",
      stepId: "screening-step",
      resumeData: { approved: true },
    });
    expect(result.current.workflowState).toMatchObject({
      current: "interview-step",
      status: "suspended",
      suspendData: {
        candidateName: "Ada",
        recommendation: "hire",
      },
    });
  });
});
