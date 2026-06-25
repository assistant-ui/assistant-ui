import { createTapRoot } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import { describe, expect, it } from "vitest";

import { ModelContext } from "../../store";
import { defineToolkit } from "../model-context/define-toolkit";
import { Tools } from "./Tools";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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

describe("Tools", () => {
  it("registers toolkit tools into an explicit model context scope", async () => {
    const root = createTapRoot(function Root() {
      return useAui(
        {
          modelContext: ModelContext(),
          tools: Tools({ toolkit }),
        },
        { parent: null },
      );
    });

    try {
      await tick();

      const contextTool = root.getValue().modelContext().getModelContext()
        .tools?.search_files;

      expect(contextTool?.description).toBe("Search files.");
      expect(contextTool).not.toHaveProperty("renderText");
      expect(root.getValue().modelContext().getState().toolNames).toEqual([
        "search_files",
      ]);
    } finally {
      root.unmount();
    }
  });

  it("registers descendant toolkit tools into the parent model context", async () => {
    const root = createTapRoot(function Root() {
      const parent = useAui(
        {
          modelContext: ModelContext(),
        },
        { parent: null },
      );

      useAui(
        {
          tools: Tools({ toolkit }),
        },
        { parent },
      );

      return parent;
    });

    try {
      await tick();

      const contextTool = root.getValue().modelContext().getModelContext()
        .tools?.search_files;

      expect(contextTool?.description).toBe("Search files.");
      expect(contextTool).not.toHaveProperty("renderText");
      expect(root.getValue().modelContext().getState().toolNames).toEqual([
        "search_files",
      ]);
    } finally {
      root.unmount();
    }
  });
});
