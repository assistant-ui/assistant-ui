import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { defineToolkit } from "./define-toolkit";
import { mergeToolkits } from "./merge-toolkits";
import type { ToolDefinition } from "./toolbox";

const tool = <
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
>(
  description: string,
) =>
  ({
    type: "backend",
    description,
  }) as ToolDefinition<TArgs, TResult>;

describe("mergeToolkits", () => {
  it("merges feature toolkits into one toolkit", () => {
    const filesTool = tool<{ query: string }, { ids: string[] }>(
      "Search files.",
    );
    const calendarTool = tool<{ title: string }, { eventId: string }>(
      "Create a calendar event.",
    );
    const filesToolkit = defineToolkit({
      search_files: filesTool,
    });
    const calendarToolkit = defineToolkit({
      create_event: calendarTool,
    });

    const appToolkit = mergeToolkits(filesToolkit, calendarToolkit);

    expect({ ...appToolkit }).toEqual({
      search_files: filesTool,
      create_event: calendarTool,
    });
    expect(appToolkit.search_files).toBe(filesTool);
    expect(appToolkit.create_event).toBe(calendarTool);
    expectTypeOf(appToolkit.search_files).toEqualTypeOf(filesTool);
    expectTypeOf(appToolkit.create_event).toEqualTypeOf(calendarTool);
  });

  it("keeps the first tool definition and warns once for a duplicate name", () => {
    const filesSearchTool = tool<{ query: string }, { files: string[] }>(
      "Search files.",
    );
    const crmSearchTool = tool<{ query: string }, { contacts: string[] }>(
      "Search CRM records.",
    );
    const calendarSearchTool = tool<{ query: string }, { events: string[] }>(
      "Search calendar events.",
    );
    const filesToolkit = defineToolkit({ search: filesSearchTool });
    const crmToolkit = defineToolkit({ search: crmSearchTool });
    const calendarToolkit = defineToolkit({ search: calendarSearchTool });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const appToolkit = mergeToolkits(
        filesToolkit,
        crmToolkit,
        calendarToolkit,
      );

      expect(appToolkit.search).toBe(filesSearchTool);
      expectTypeOf(appToolkit.search).toEqualTypeOf(filesSearchTool);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        '[assistant-ui] Duplicate tool name "search" while merging toolkits. Keeping the first definition.',
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn when tool names are unique", () => {
    const filesToolkit = defineToolkit({ search_files: tool("Search files.") });
    const crmToolkit = defineToolkit({ search_crm: tool("Search CRM.") });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      mergeToolkits(filesToolkit, crmToolkit);

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("keeps prototype-like tool names as own entries", () => {
    const protoTool = tool("Prototype-safe tool.");
    const protoToolkit = defineToolkit(
      Object.defineProperty({}, "__proto__", {
        value: protoTool,
        enumerable: true,
      }) as { __proto__: typeof protoTool },
    );

    const appToolkit = mergeToolkits(protoToolkit);

    expect(Object.getPrototypeOf(appToolkit)).toBeNull();
    expect(Object.hasOwn(appToolkit, "__proto__")).toBe(true);
    expect(appToolkit["__proto__"]).toBe(protoTool);
  });
});
