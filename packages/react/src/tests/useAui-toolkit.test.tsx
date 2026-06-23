// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";
import { AuiProvider, defineToolkit, useAui } from "../index";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("useAui toolkit shorthand", () => {
  it("registers toolkit tools and renderers through the tools client", async () => {
    const toolkit = defineToolkit({
      search_files: {
        type: "backend",
        description: "Search files.",
        parameters: { type: "object", properties: {} },
        renderText: {
          running: "Searching files",
          complete: "Finished searching files",
        },
      } as never,
    });
    const captured: { aui?: ReturnType<typeof useAui> } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      return null;
    };
    const App: FC = () => {
      const aui = useAui({ tools: toolkit });
      return (
        <AuiProvider value={aui}>
          <Capture />
        </AuiProvider>
      );
    };

    render(<App />);
    await act(async () => {
      await flush();
    });

    const contextTool = captured.aui!.modelContext().getModelContext()
      .tools?.search_files;
    expect(contextTool?.description).toBe("Search files.");
    expect(contextTool).not.toHaveProperty("renderText");
    expect(captured.aui!.tools().getState().toolUIs.search_files).toHaveLength(
      1,
    );
  });
});
