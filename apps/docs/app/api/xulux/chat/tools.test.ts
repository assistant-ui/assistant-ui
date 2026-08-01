import type { FrontendTools } from "@assistant-ui/react-ai-sdk";
import { createAppBuilderTools, createLearnAgentTools } from "./tools";
import { appBuilderAgent, learnAgent } from "./agents";

describe("Xulux chat tool inventories", () => {
  const clientTools = {} as FrontendTools;
  const routeUrl = "http://localhost/api/xulux/chat";

  it("preserves the App Builder inventory", () => {
    const tools = createAppBuilderTools({ clientTools, routeUrl });

    expect(Object.keys(tools)).toEqual([
      "inspectSourceMap",
      "readSourceMapFile",
      "listDocs",
      "readDoc",
      "getTemplateList",
      "getTemplateDetails",
      "openTemplatePreview",
    ]);
    expect("getNextCourseStep" in tools).toBe(false);
  });

  it("combines common and course tools for Learn", () => {
    const tools = createLearnAgentTools({
      routeUrl,
      learnContext: {
        courseId: "build-generative-ui-assistant",
        status: "in_progress",
        currentStepId: "meet-the-project",
        selectedStepId: "meet-the-project",
      },
    });

    expect(Object.keys(tools)).toEqual([
      "inspectSourceMap",
      "readSourceMapFile",
      "listDocs",
      "readDoc",
      "getNextCourseStep",
    ]);
    expect("openTemplatePreview" in tools).toBe(false);
    expect("getTemplateList" in tools).toBe(false);
    expect("getTemplateDetails" in tools).toBe(false);
  });
});

describe("Xulux agent loop policies", () => {
  it("preserves App Builder without inspecting Learn context", () => {
    expect(appBuilderAgent.maxSteps).toBe(50);
    expect(appBuilderAgent.activeToolsAfterFirstStep).toBeUndefined();
    const tools = appBuilderAgent.prepareTools({
      body: { learnContext: { arbitrary: true } },
      clientTools: {} as FrontendTools,
      routeUrl: "http://localhost/api/xulux/chat",
    });
    expect("getTemplateList" in tools).toBe(true);
  });

  it("allows Learn lookups without repeated course advancement", () => {
    expect(learnAgent.maxSteps).toBeGreaterThan(2);
    expect(learnAgent.activeToolsAfterFirstStep).toEqual([
      "inspectSourceMap",
      "readSourceMapFile",
      "listDocs",
      "readDoc",
    ]);
    expect(learnAgent.activeToolsAfterFirstStep).not.toContain(
      "getNextCourseStep",
    );
  });
});
