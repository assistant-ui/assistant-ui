import type { FrontendTools } from "@assistant-ui/react-ai-sdk";
import {
  createLearnPreviewTools,
  getLearnPreviewStageId,
  learnPreviewAgent,
} from "./preview-agent";

const routeUrl = (stageId: string, sessionId = "preview-session") =>
  `https://assistant-ui.com/api/xulux/learn/preview/${stageId}/chat?sessionId=${sessionId}`;

const updateNotepadTool: FrontendTools[string] = {
  description: "Update the active notepad.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["id"],
  },
};

describe("hosted Learn preview agent", () => {
  it("accepts only registered preview-stage route URLs", () => {
    expect(getLearnPreviewStageId(routeUrl("S1"))).toBe("S1");
    expect(getLearnPreviewStageId(routeUrl("S7"))).toBe("S7");
    expect(getLearnPreviewStageId(routeUrl("S0"))).toBeNull();
    expect(getLearnPreviewStageId(routeUrl("toString"))).toBeNull();
    expect(
      getLearnPreviewStageId(
        "https://assistant-ui.com/api/xulux/learn/preview/S7/source",
      ),
    ).toBeNull();
  });

  it("keeps tools unavailable before the weather lesson", () => {
    const tools = createLearnPreviewTools({
      clientTools: {},
      routeUrl: routeUrl("S2"),
    });

    expect(tools).not.toBeInstanceOf(Response);
    expect(Object.keys(tools)).toEqual([]);
  });

  it("adds only server-owned weather tools in weather stages", () => {
    const tools = createLearnPreviewTools({
      clientTools: {
        untrusted_tool: updateNotepadTool,
      } as FrontendTools,
      routeUrl: routeUrl("S4"),
    });

    expect(tools).not.toBeInstanceOf(Response);
    expect(Object.keys(tools)).toEqual(["geocode_location", "get_weather"]);
  });

  it("allows only the dynamic notepad update tool in interactable stages", () => {
    const tools = createLearnPreviewTools({
      clientTools: {
        update_notepad: updateNotepadTool,
        untrusted_tool: updateNotepadTool,
      } as FrontendTools,
      routeUrl: routeUrl("S5"),
    });

    expect(tools).not.toBeInstanceOf(Response);
    expect(Object.keys(tools)).toEqual([
      "geocode_location",
      "get_weather",
      "notepad",
      "update_notepad",
    ]);
  });

  it("rejects malformed uploaded update tools", async () => {
    const result = createLearnPreviewTools({
      clientTools: {
        update_notepad: { description: "missing parameters" },
      } as unknown as FrontendTools,
      routeUrl: routeUrl("S5"),
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    await expect((result as Response).json()).resolves.toEqual({
      error: "Invalid preview tool definition.",
    });
  });

  it("uses the preview session and dedicated trace identity", () => {
    expect(
      learnPreviewAgent.resolveSessionId?.({
        body: {},
        routeUrl: routeUrl("S3", "course-preview-123"),
      }),
    ).toBe("course-preview-123");
    expect(learnPreviewAgent.traceName).toBe("xulux_learn_preview");
    expect(
      learnPreviewAgent.getTraceMetadata?.({
        body: {},
        routeUrl: routeUrl("S3"),
      }),
    ).toEqual({
      course_id: "build-generative-ui-assistant",
      stage_id: "S3",
    });
  });
});
