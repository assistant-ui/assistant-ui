// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformScope, type Platform } from "../platform/context";
import { DocsPager } from "./docs-pager";

describe("DocsPager", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each<Platform>(["react", "rn", "ink", "tap", "cloud"])(
    "uses the %s Markdown URL for both viewing and asking Claude",
    async (platform) => {
      const markdownUrl = "/docs/example.md";
      const expectedUrl =
        platform === "react"
          ? markdownUrl
          : `${markdownUrl}?platform=${platform}`;
      const fetchMock = vi.fn(async () => ({
        ok: true,
        text: async () => "Markdown content",
      }));
      vi.stubGlobal("fetch", fetchMock);

      render(
        <PlatformScope platform={platform}>
          <DocsPager
            title="Example"
            markdownUrl={markdownUrl}
            platformAwareMarkdown
          />
        </PlatformScope>,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "More page actions" }),
      );

      const markdownAction = await screen.findByRole("menuitem", {
        name: /View as Markdown/,
      });
      expect(markdownAction.getAttribute("href")).toBe(
        `https://www.assistant-ui.com${expectedUrl}`,
      );
      const claudeAction = screen.getByRole("menuitem", {
        name: /Open in Claude/,
      });
      const claudeUrl = new URL(claudeAction.getAttribute("href")!);
      expect(claudeUrl.searchParams.get("q")).toBe(
        `Read https://www.assistant-ui.com${expectedUrl} (the assistant-ui documentation page "Example") so I can ask questions about it.`,
      );
      expect(screen.getAllByRole("menuitem")).toHaveLength(5);
      expect(
        screen
          .getByRole("menuitem", { name: /Open in Codex/ })
          .getAttribute("href"),
      ).toBe("https://chatgpt.com/codex/");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expectedUrl));
    },
  );

  it("does not show page actions without a Markdown URL", () => {
    render(<DocsPager title="Example" />);

    expect(
      screen.queryByRole("button", { name: "More page actions" }),
    ).toBeNull();
  });
});
