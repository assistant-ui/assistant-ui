import type { FrontendTools } from "@assistant-ui/react-ai-sdk";
import { createAppBuilderTools, createLearnAgentTools } from "./tools";

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
