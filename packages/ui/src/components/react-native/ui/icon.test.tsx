import { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { ArrowUpIcon } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Icon } from "./icon";

const h = vi.hoisted(() => ({
  hasStyleSheet: true,
  sizes: [] as (number | undefined)[],
}));

vi.mock("uniwind", async () => {
  const React = await import("react");

  return {
    withUniwind:
      (Component: React.ComponentType<any>) =>
      ({ className, ...props }: Record<string, unknown>) =>
        React.createElement(Component, {
          ...(className !== undefined && h.hasStyleSheet
            ? { size: 16, color: "rgb(1, 2, 3)" }
            : {}),
          ...props,
        }),
  };
});

const TestIcon = (({
  size = 24,
  color = "currentColor",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) => {
  h.sizes.push(size);
  return (
    <svg data-testid="icon" className={className} width={size} stroke={color} />
  );
}) as LucideIcon;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Icon", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    h.hasStyleSheet = true;
    h.sizes.length = 0;
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
      <Icon as={TestIcon} className="text-primary size-4" />,
    );
    const serverIcon = container.querySelector("[data-testid=icon]");
    expect(serverIcon?.getAttribute("width")).toBe("24");
    expect(serverIcon?.getAttribute("stroke")).toBe("currentColor");
    expect(serverIcon?.getAttribute("class")).toBe("text-primary size-4");

    h.hasStyleSheet = true;
    const consoleError = vi.spyOn(console, "error");
    await act(async () => {
      root = hydrateRoot(
        container,
        <Icon as={TestIcon} className="text-primary size-4" />,
      );
    });

    const icon = container.querySelector("[data-testid=icon]");
    expect(icon?.getAttribute("width")).toBe("16");
    expect(icon?.getAttribute("stroke")).toBe("rgb(1, 2, 3)");
    expect(icon?.getAttribute("class")).toBe("text-primary size-4");
    expect(icon).toBe(serverIcon);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("resolves the class-derived props on the first client render", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Icon as={TestIcon} className="text-primary size-4" />);
    });

    expect(h.sizes).toEqual([16]);
    const icon = container.querySelector("[data-testid=icon]");
    expect(icon?.getAttribute("width")).toBe("16");
    expect(icon?.getAttribute("class")).toBe("text-primary size-4");
  });

  it("keeps the class on a real lucide svg", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Icon as={ArrowUpIcon} className="text-primary size-4" />);
    });

    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("text-primary")).toBe(true);
    expect(svg?.classList.contains("size-4")).toBe(true);
  });

  it("keeps the default size class off an icon with explicit dimensions", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <>
          <Icon as={TestIcon} />
          <Icon as={TestIcon} size={14} />
          <Icon as={TestIcon} width={14} height={14} />
        </>,
      );
    });

    const [defaultIcon, sizedIcon, boxedIcon] =
      container.querySelectorAll("[data-testid=icon]");
    expect(defaultIcon?.getAttribute("class")).toBe("text-foreground size-5");
    expect(sizedIcon?.getAttribute("width")).toBe("14");
    expect(sizedIcon?.getAttribute("class")).toBe("text-foreground");
    expect(boxedIcon?.getAttribute("class")).toBe("text-foreground");
  });
});
