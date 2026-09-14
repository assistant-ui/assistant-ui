import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import type { LucideIcon } from "lucide-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Icon } from "./icon";

const h = vi.hoisted(() => ({
  stylesIndexed: false,
  resolutions: [] as string[],
}));

vi.mock("uniwind", async () => {
  const React = await import("react");

  return {
    withUniwind:
      (Component: React.ComponentType<any>) =>
      (props: Record<string, unknown>) => {
        const { className: _className, ...componentProps } = props;
        const stylesIndexed = h.stylesIndexed;
        h.resolutions.push(stylesIndexed ? "resolved" : "fallback");
        h.stylesIndexed = true;
        return React.createElement(Component, {
          ...componentProps,
          ...(stylesIndexed
            ? { size: 16, color: "rgb(1, 2, 3)" }
            : { size: 24, color: "currentColor" }),
        });
      },
  };
});

const TestIcon = (({ size, color }: { size?: number; color?: string }) => (
  <svg data-testid="icon" width={size} color={color} />
)) as LucideIcon;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Icon", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.stylesIndexed = false;
    h.resolutions.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("re-resolves class-derived props after web hydration", async () => {
    container.innerHTML = renderToString(
      <Icon as={TestIcon} className="text-primary size-4" />,
    );
    h.stylesIndexed = false;
    h.resolutions.length = 0;

    await act(async () => {
      root = hydrateRoot(
        container,
        <Icon as={TestIcon} className="text-primary size-4" />,
      );
    });

    const icon = container.querySelector("[data-testid=icon]");
    expect(h.resolutions).toEqual(["fallback", "resolved"]);
    expect(icon?.getAttribute("width")).toBe("16");
    expect(icon?.getAttribute("color")).toBe("rgb(1, 2, 3)");
  });
});
