import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LinkPreview } from "./link-preview";

afterEach(cleanup);

describe("LinkPreview", () => {
  it("links a safe URL and leaves an unsafe URL as static content", () => {
    const { rerender } = render(
      <LinkPreview href="https://example.com/guide" title="A guide" />,
    );

    const link = screen.getByRole("link", { name: /A guide/ });
    expect(link.getAttribute("href")).toBe("https://example.com/guide");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    rerender(<LinkPreview href="javascript:alert(1)" title="Unsafe guide" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Unsafe guide")).toBeTruthy();
  });

  it("uses the host for a missing title and site name", () => {
    render(<LinkPreview href="https://www.example.com/guide" />);

    expect(screen.getAllByText("example.com")).toHaveLength(2);
  });

  it("uses a favicon when available and an initial otherwise", () => {
    const { container, rerender } = render(
      <LinkPreview
        href="https://assistant-ui.com"
        siteName="assistant-ui"
        favicon="/favicon.png"
      />,
    );

    expect(
      container.querySelector('[data-slot="link-preview-favicon"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-slot="link-preview-site-initial"]'),
    ).toBeNull();

    rerender(
      <LinkPreview href="https://assistant-ui.com" siteName="assistant-ui" />,
    );

    expect(
      container.querySelector('[data-slot="link-preview-favicon"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="link-preview-site-initial"]')
        ?.textContent,
    ).toBe("A");
  });

  it("marks its compact layout", () => {
    const { container } = render(
      <LinkPreview href="https://example.com" layout="compact" />,
    );

    expect(
      container
        .querySelector('[data-slot="link-preview"]')
        ?.getAttribute("data-layout"),
    ).toBe("compact");
  });

  it("removes an image frame when the image fails", () => {
    const { container } = render(
      <LinkPreview href="https://example.com" image="/missing.png" />,
    );
    const frame = container.querySelector('[data-slot="link-preview-image"]');
    const image = frame?.querySelector("img");

    expect(frame).toBeTruthy();
    expect(image).toBeTruthy();
    fireEvent.error(image!);
    expect(
      container.querySelector('[data-slot="link-preview-image"]'),
    ).toBeNull();
  });
});
