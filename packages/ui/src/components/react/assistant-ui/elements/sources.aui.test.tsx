import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SourceIcon, Sources } from "./sources.aui";

const imageDescriptors = {
  complete: Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "complete",
  )!,
  naturalWidth: Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "naturalWidth",
  )!,
};

const stubImage = (complete: boolean, naturalWidth: number) => {
  Object.defineProperties(HTMLImageElement.prototype, {
    complete: { configurable: true, get: () => complete },
    naturalWidth: { configurable: true, get: () => naturalWidth },
  });
};

afterEach(() => {
  cleanup();
  Object.defineProperties(HTMLImageElement.prototype, imageDescriptors);
});

const renderIcon = () =>
  render(<SourceIcon url="https://example.com/reference" />);

describe("SourceIcon", () => {
  it("falls back to the domain initial when the image failed before mount", () => {
    stubImage(true, 0);

    const { container } = renderIcon();

    expect(screen.getByText("E")).toBeTruthy();
    expect(container.querySelector('[data-slot="source-icon"]')).toBeNull();
  });

  it("keeps the image while it is still loading", () => {
    stubImage(false, 0);

    const { container } = renderIcon();

    expect(container.querySelector('[data-slot="source-icon"]')).toBeTruthy();
    expect(
      container.querySelector('[data-slot="source-icon-fallback"]'),
    ).toBeNull();
  });

  it("keeps an image that loaded", () => {
    stubImage(true, 16);

    const { container } = renderIcon();

    expect(container.querySelector('[data-slot="source-icon"]')).toBeTruthy();
    expect(
      container.querySelector('[data-slot="source-icon-fallback"]'),
    ).toBeNull();
  });

  it("falls back when a loading image errors after mount", () => {
    stubImage(false, 0);

    const { container } = renderIcon();
    const image = container.querySelector('[data-slot="source-icon"]')!;
    fireEvent.error(image);

    expect(screen.getByText("E")).toBeTruthy();
  });

  it("detects the failure even when the caller passes a ref", () => {
    stubImage(true, 0);
    const callerRef = vi.fn();

    render(<SourceIcon url="https://example.com/reference" ref={callerRef} />);

    expect(screen.getByText("E")).toBeTruthy();
    expect(callerRef).toHaveBeenCalledWith(
      screen.getByText("E") as HTMLSpanElement,
    );
  });
});

describe("Sources", () => {
  it("only links source URLs safeHref accepts", () => {
    render(
      <>
        <Sources
          type="source"
          sourceType="url"
          id="unsafe"
          url="javascript:alert(1)"
          title="Unsafe source"
          status={{ type: "complete" }}
        />
        <Sources
          type="source"
          sourceType="url"
          id="safe"
          url="https://example.com/reference"
          title="Safe source"
          status={{ type: "complete" }}
        />
      </>,
    );

    const unsafeSource = screen
      .getByText("Unsafe source")
      .closest('[data-slot="source"]');
    expect(unsafeSource?.tagName).toBe("SPAN");
    expect(unsafeSource?.getAttribute("href")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Safe source" }).getAttribute("href"),
    ).toBe("https://example.com/reference");
  });

  it("falls back to the raw url text when no title or domain can be shown", () => {
    render(
      <Sources
        type="source"
        sourceType="url"
        id="bare"
        url="example.com/report"
        title=""
        status={{ type: "complete" }}
      />,
    );

    expect(screen.getByText("example.com/report")).toBeTruthy();
  });
});
