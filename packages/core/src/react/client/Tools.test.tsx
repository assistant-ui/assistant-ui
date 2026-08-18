// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAui } from "@assistant-ui/store";
import { Tools } from "./Tools";
import type { Toolkit } from "../model-context/toolbox";

type AnyClient = Record<string, any>;

const toolkit = {
  showChart: {
    description: "render a chart",
    parameters: { type: "object", properties: {} },
    unstable_backendDefault: { parameters: true },
    execute: async () => ({}),
  },
} as unknown as Toolkit;

const renderToolkit = (uploadBackendDefaults?: boolean) => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui({
      tools: Tools({ toolkit, uploadBackendDefaults }),
    } as never);
    return null;
  };
  render(<Harness />);
  return aui.modelContext().getModelContext().tools;
};

afterEach(() => {
  cleanup();
});

describe("Tools uploadBackendDefaults", () => {
  it("keeps unstable_backendDefault by default", () => {
    const tools = renderToolkit();
    expect(tools.showChart.unstable_backendDefault).toEqual({
      parameters: true,
    });
  });

  it("strips unstable_backendDefault when uploadBackendDefaults is set", () => {
    const tools = renderToolkit(true);
    expect(tools.showChart.unstable_backendDefault).toBeUndefined();
    expect(tools.showChart.parameters).toEqual({
      type: "object",
      properties: {},
    });
    expect(tools.showChart.execute).toBeTypeOf("function");
  });
});
