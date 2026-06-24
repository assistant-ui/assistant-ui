// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";
import { AuiProvider, defineToolkit, useAui, useAuiState } from "../index";

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
    const observed: {
      modelToolNames?: string;
      rendererToolNames?: string;
    } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      observed.modelToolNames = useAuiState((state) =>
        state.modelContext.toolNames.join(","),
      );
      observed.rendererToolNames = useAuiState((state) =>
        Object.keys(state.tools.toolUIs).sort().join(","),
      );
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
    expect(observed.modelToolNames).toBe("search_files");
    expect(observed.rendererToolNames).toBe("search_files");
  });

  it("keeps the client stable when shorthand props are inline", async () => {
    const toolkit = defineToolkit({
      search_files: {
        type: "backend",
        description: "Search files.",
        parameters: { type: "object", properties: {} },
      } as never,
    });
    const clients: ReturnType<typeof useAui>[] = [];

    const App: FC<{ label: string }> = ({ label }) => {
      const aui = useAui({ tools: toolkit });
      clients.push(aui);
      return (
        <AuiProvider value={aui}>
          <div>{label}</div>
        </AuiProvider>
      );
    };

    const { rerender } = render(<App label="before" />);
    await act(async () => {
      await flush();
    });

    rerender(<App label="after" />);
    await act(async () => {
      await flush();
    });

    expect(clients[1]).toBe(clients[0]);
  });
});
