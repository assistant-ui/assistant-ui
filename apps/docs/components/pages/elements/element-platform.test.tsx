// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { ElementPlatformProvider } from "./element-platform";

afterEach(() => {
  cleanup();
});

describe("ElementPlatformProvider hint script", () => {
  it("ships in the server HTML for a native element", () => {
    const html = renderToString(
      <ElementPlatformProvider native>x</ElementPlatformProvider>,
    );
    expect(html).toContain("data-docs-key=");
  });

  it("is not created by a client-side mount, where React would never run it", () => {
    const { container } = render(
      <ElementPlatformProvider native>x</ElementPlatformProvider>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("style")).not.toBeNull();
  });
});
