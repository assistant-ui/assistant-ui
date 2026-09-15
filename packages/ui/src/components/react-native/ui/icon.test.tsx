import { act, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import type { LucideIcon } from "lucide-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Icon } from "./icon";

const h = vi.hoisted(() => ({
  hasStyleSheet: true,
  mounts: 0,
}));

vi.mock("uniwind", async () => {
  const React = await import("react");

  return {
    withUniwind:
      (Component: React.ComponentType<any>) =>
      (props: Record<string, unknown>) => {
        const { className: _className, ...componentProps } = props;

        return React.createElement(Component, {
          ...componentProps,
          ...(h.hasStyleSheet ? { size: 16, color: "rgb(1, 2, 3)" } : {}),
        });
      },
  };
});

const TestIcon = (({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => {
  useEffect(() => {
    h.mounts += 1;
  }, []);

  return <svg data-testid="icon" width={size} stroke={color} />;
}) as LucideIcon;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Icon", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.hasStyleSheet = true;
    h.mounts = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("replaces the server markup defaults with the class-derived props after hydration", async () => {
    h.hasStyleSheet = false;
    container.innerHTML = renderToString(
      <Icon as={TestIcon} className="text-primary size-4" />,
    );
    const serverIcon = container.querySelector("[data-testid=icon]");
    expect(serverIcon?.getAttribute("width")).toBe("24");
    expect(serverIcon?.getAttribute("stroke")).toBe("currentColor");

    h.hasStyleSheet = true;
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await act(async () => {
      root = hydrateRoot(
        container,
        <Icon as={TestIcon} className="text-primary size-4" />,
      );
    });
    const hydrationWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes("didn't match"),
    );
    consoleError.mockRestore();

    expect(hydrationWarnings).toHaveLength(1);
    const icon = container.querySelector("[data-testid=icon]");
    expect(icon?.getAttribute("width")).toBe("16");
    expect(icon?.getAttribute("stroke")).toBe("rgb(1, 2, 3)");
    expect(icon).not.toBe(serverIcon);
  });

  it("mounts once on a client render", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Icon as={TestIcon} className="text-primary size-4" />);
    });

    const icon = container.querySelector("[data-testid=icon]");
    expect(icon?.getAttribute("width")).toBe("16");
    expect(h.mounts).toBe(1);
  });
});
