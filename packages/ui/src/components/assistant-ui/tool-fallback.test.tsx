/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ToolFallback } from "./tool-fallback";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolFallback", () => {
  it("renders the default fallback accordion trigger and reveals details on expand", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ToolFallback
          type="tool-call"
          toolCallId="tool-call-1"
          toolName="search_web"
          args={{ query: "assistant-ui chain of thought" }}
          argsText='{"query":"assistant-ui chain of thought"}'
          result={{ hits: 7, summary: "Found docs and examples." }}
          status={{ type: "complete" }}
          addResult={() => {}}
          resume={() => {}}
        />,
      );
    });

    const fallbackRoot = container.querySelector(
      "[data-slot=tool-fallback-root]",
    ) as HTMLElement | null;
    const trigger = container.querySelector(
      "[data-slot=tool-fallback-trigger]",
    ) as HTMLButtonElement | null;
    const chevron = container.querySelector(
      "[data-slot=tool-fallback-trigger-chevron]",
    ) as HTMLElement | null;
    const label = container.querySelector(
      "[data-slot=tool-fallback-trigger-label]",
    ) as HTMLElement | null;

    expect(fallbackRoot).not.toBeNull();
    expect(fallbackRoot?.className).toContain("rounded-lg");
    expect(fallbackRoot?.className).toContain("border");
    expect(trigger).not.toBeNull();
    expect(chevron).not.toBeNull();
    expect(label?.textContent).toContain("Used tool: search_web");
    expect(
      container.querySelector("[data-slot=tool-fallback-trigger-icon]"),
    ).not.toBeNull();
    expect(trigger?.lastElementChild).toBe(chevron);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Found docs and examples.");

    act(() => {
      trigger?.click();
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Found docs and examples.");
    expect(container.textContent).toContain("assistant-ui chain of thought");

    act(() => {
      root.unmount();
    });
  });

  it("disables expanding when there are no details", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ToolFallback
          type="tool-call"
          toolCallId="tool-call-2"
          toolName="search_web"
          args={{ query: "assistant-ui chain of thought" }}
          argsText=""
          status={{ type: "running" }}
          addResult={() => {}}
          resume={() => {}}
        />,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=tool-fallback-trigger]",
    ) as HTMLButtonElement | null;
    const chevron = container.querySelector(
      "[data-slot=tool-fallback-trigger-chevron]",
    ) as HTMLElement | null;

    expect(trigger?.hasAttribute("disabled")).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(chevron?.getAttribute("class")).toContain("opacity-50");

    act(() => {
      root.unmount();
    });
  });

  it("allows custom trigger content to omit the default chevron", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ToolFallback
          type="tool-call"
          toolCallId="tool-call-3"
          toolName="search_web"
          args={{ query: "assistant-ui chain of thought" }}
          argsText='{"query":"assistant-ui chain of thought"}'
          result={{ hits: 3 }}
          status={{ type: "complete" }}
          addResult={() => {}}
          resume={() => {}}
          renderTriggerContent={({ label, toolName }) => (
            <span data-slot="custom-tool-fallback-trigger-content">
              {label} {toolName}
            </span>
          )}
        />,
      );
    });

    const customContent = container.querySelector(
      "[data-slot=custom-tool-fallback-trigger-content]",
    ) as HTMLElement | null;
    const defaultChevron = container.querySelector(
      "[data-slot=tool-fallback-trigger-chevron]",
    );
    const defaultLabel = container.querySelector(
      "[data-slot=tool-fallback-trigger-label]",
    );

    expect(customContent).not.toBeNull();
    expect(customContent?.textContent).toContain("Used tool search_web");
    expect(defaultChevron).toBeNull();
    expect(defaultLabel).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
