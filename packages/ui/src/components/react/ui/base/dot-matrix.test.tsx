import { cleanup, render } from "@testing-library/react";
import { version } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it } from "vitest";
import { DotMatrix as BaseDotMatrix } from "./dot-matrix";
import { DotMatrix as RadixDotMatrix } from "../radix/dot-matrix";

const onReact18 = version.startsWith("18.");

afterEach(() => {
  cleanup();
  document
    .querySelectorAll(
      'style[data-aui-dot-matrix], style[href="aui-dot-matrix"], style[data-href="aui-dot-matrix"]',
    )
    .forEach((style) => style.remove());
});

it("renders a stylesheet for both variants", () => {
  render(
    <>
      <BaseDotMatrix />
      <RadixDotMatrix />
    </>,
  );
  if (onReact18) {
    const styles = document.querySelectorAll("style[data-aui-dot-matrix]");
    expect(styles).toHaveLength(2);
    expect(styles[0]?.textContent).toContain("@keyframes aui-dot-matrix-blink");
    expect(styles[1]?.textContent).toContain("@keyframes aui-dot-matrix-blink");
  } else {
    expect(
      document.head.querySelectorAll('style[data-href="aui-dot-matrix"]'),
    ).toHaveLength(1);
  }
});

it("includes its stylesheet in server markup", () => {
  const markup = renderToString(
    <>
      <BaseDotMatrix />
      <RadixDotMatrix />
    </>,
  );

  expect(markup).toContain("aui-dot-matrix-blink");
});
