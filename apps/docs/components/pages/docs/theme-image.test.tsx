// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeImage, ThemeImageLLM } from "./theme-image";

const props = {
  light: "/docs/demo-light.webp",
  dark: "/docs/demo.webp",
  alt: "A demo",
  width: 1320,
  height: 720,
};

afterEach(cleanup);

describe("ThemeImage", () => {
  it("renders one lazy image per theme, hidden by the theme class", () => {
    const { container } = render(<ThemeImage {...props} />);
    const [light, dark] = [...container.querySelectorAll("img")];

    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(light?.getAttribute("src")).toBe(props.light);
    expect(light?.classList.contains("dark:hidden")).toBe(true);
    expect(dark?.getAttribute("src")).toBe(props.dark);
    expect(dark?.classList.contains("hidden")).toBe(true);
    expect(dark?.classList.contains("dark:block")).toBe(true);
    for (const img of [light, dark]) {
      expect(img?.getAttribute("loading")).toBe("lazy");
      expect(img?.getAttribute("alt")).toBe(props.alt);
    }
  });

  it("exports a single image to the markdown output", () => {
    const { container } = render(<ThemeImageLLM {...props} />);
    const images = container.querySelectorAll("img");

    expect(images).toHaveLength(1);
    expect(images[0]?.getAttribute("src")).toBe(props.light);
    expect(images[0]?.getAttribute("alt")).toBe(props.alt);
  });
});
