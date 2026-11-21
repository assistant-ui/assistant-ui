import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnchorAlias } from "./anchor-alias";

describe("anchor alias", () => {
  it("renders an empty target for the old anchor", () => {
    expect(renderToStaticMarkup(<AnchorAlias id="getting-started" />)).toBe(
      '<span id="getting-started" aria-hidden="true" class="block scroll-m-28"></span>',
    );
  });
});
