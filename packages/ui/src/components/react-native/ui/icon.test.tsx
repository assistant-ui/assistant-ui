import { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import type { LucideIcon } from "lucide-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Icon } from "./icon";

const h = vi.hoisted(() => ({
  hasStyleSheet: true,
  sizes: [] as (number | undefined)[],
  styles: [] as unknown[],
}));

vi.mock("uniwind", async () => {
  const React = await import("react");

  return {
    withUniwind:
      (
        Component: React.ComponentType<any>,
        options?: Record<string, unknown>,
      ) =>
      ({ className, ...props }: Record<string, unknown>) =>
        React.createElement(Component, {
          ...props,
          ...(className !== undefined && h.hasStyleSheet
            ? {
                size: 16,
                color: "rgb(1, 2, 3)",
                ...(options?.style !== undefined
                  ? { style: { marginTop: 2 } }
                  : {}),
              }
            : {}),
        }),
  };
});

const TestIcon = (({
  size = 24,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  style?: unknown;
}) => {
  h.sizes.push(size);
  h.styles.push(style);
  return <svg data-testid="icon" width={size} stroke={color} />;
}) as LucideIcon;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Icon", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    h.hasStyleSheet = true;
    h.sizes.length = 0;
    h.styles.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it("hydrates the server markup and then applies the class-derived props", async () => {
    h.hasStyleSheet = false;
    container.innerHTML = renderToString(
      <Icon as={TestIcon} className="text-primary mt-0.5 size-4" />,
    );
    const serverIcon = container.querySelector("[data-testid=icon]");
    expect(serverIcon?.getAttribute("width")).toBe("24");
    expect(serverIcon?.getAttribute("stroke")).toBe("currentColor");

    h.hasStyleSheet = true;
    const consoleError = vi.spyOn(console, "error");
    await act(async () => {
      root = hydrateRoot(
        container,
        <Icon as={TestIcon} className="text-primary mt-0.5 size-4" />,
      );
    });

    const icon = container.querySelector("[data-testid=icon]");
    expect(icon?.getAttribute("width")).toBe("16");
    expect(icon?.getAttribute("stroke")).toBe("rgb(1, 2, 3)");
    expect(h.styles[h.styles.length - 1]).toEqual({ marginTop: 2 });
    expect(icon).toBe(serverIcon);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("resolves the class-derived props on the first client render", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <Icon as={TestIcon} className="text-primary mt-0.5 size-4" />,
      );
    });

    expect(h.sizes).toEqual([16]);
    expect(h.styles).toEqual([{ marginTop: 2 }]);
    expect(
      container.querySelector("[data-testid=icon]")?.getAttribute("width"),
    ).toBe("16");
  });
});
