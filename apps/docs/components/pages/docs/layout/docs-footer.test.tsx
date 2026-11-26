// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformScope, type Platform } from "../platform/context";
import { DocsFooter } from "./docs-footer";

describe("DocsFooter", () => {
  it.each<[Platform, string]>([
    ["react", "/docs/runtimes"],
    ["rn", "/docs/react-native/elements"],
  ])(
    "on a shared page, links the %s reader to the next page of its book",
    (platform, nextUrl) => {
      render(
        <PlatformScope platform={platform}>
          <DocsFooter
            next={{ name: "Runtimes", url: "/docs/runtimes" }}
            neighboursByPlatform={{
              rn: {
                next: { name: "Elements", url: "/docs/react-native/elements" },
              },
            }}
          />
        </PlatformScope>,
      );

      const hrefs = screen
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
      expect(hrefs).toEqual([nextUrl]);
    },
  );
});
