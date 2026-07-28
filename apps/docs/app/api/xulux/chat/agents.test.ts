import type { FrontendTools } from "@assistant-ui/react-ai-sdk";
import { appBuilderAgent, learnAgent } from "./agents";

describe("Xulux agent loop policies", () => {
  it("preserves the App Builder loop policy", () => {
    expect(appBuilderAgent.maxSteps).toBe(50);
    expect(appBuilderAgent.activeToolsAfterFirstStep).toBeUndefined();
  });

  it("does not inspect Learn context on the App Builder route", () => {
    const tools = appBuilderAgent.prepareTools({
      body: { learnContext: { arbitrary: true } },
      clientTools: {} as FrontendTools,
      routeUrl: "http://localhost/api/xulux/chat",
    });

    expect("getTemplateList" in tools).toBe(true);
  });

  it("allows Learn source lookups without allowing repeated advancement", () => {
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
