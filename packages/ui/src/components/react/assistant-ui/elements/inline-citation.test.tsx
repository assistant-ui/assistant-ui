import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Citation, InlineCitation, type Source } from "./inline-citation";

afterEach(cleanup);

const SOURCE: Source = {
  title: "Optimistic updates in the runtime",
  snippet: "The runtime applies local edits before the server responds.",
};

describe("InlineCitation", () => {
  it("renders caller prose with citation markers", () => {
    render(
      <InlineCitation>
        The write is visible immediately
        <Citation index={0} source={SOURCE} />.
      </InlineCitation>,
    );

    expect(screen.getByText(/The write is visible immediately/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Source 1/ }).textContent).toBe(
      "1",
    );
  });

  it("names each marker after its source", () => {
    render(<Citation index={1} source={SOURCE} />);

    expect(
      screen.getByRole("button", {
        name: "Source 2: Optimistic updates in the runtime",
      }),
    ).toBeTruthy();
  });

  it("renders the controlled preview with its date", () => {
    render(
      <Citation
        index={0}
        source={{ ...SOURCE, publishedAt: "2024-01-15T12:00:00.000Z" }}
        open
      />,
    );

    expect(screen.getByText(SOURCE.title)).toBeTruthy();
    expect(screen.getByText(SOURCE.snippet)).toBeTruthy();
    expect(screen.getByText("Jan 2024")).toBeTruthy();
  });

  it("links safe source URLs but leaves unsafe ones inert", () => {
    const { rerender } = render(
      <Citation
        index={0}
        source={{ ...SOURCE, url: "https://example.com/runtime" }}
        open
      />,
    );

    const link = screen.getByRole("link", {
      name: "Open source (opens in a new tab)",
    });
    expect(link.getAttribute("href")).toBe("https://example.com/runtime");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    rerender(
      <Citation
        index={0}
        source={{ ...SOURCE, url: "javascript:alert(1)" }}
        open
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Open source (opens in a new tab)" }),
    ).toBeNull();
  });

  it("uses the source URL host when no domain is provided", () => {
    render(
      <Citation
        index={0}
        source={{ ...SOURCE, url: "https://www.example.com/runtime" }}
        open
      />,
    );

    expect(screen.getByText("example.com")).toBeTruthy();
  });
});
