import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createActionButton } from "./createActionButton";

const TestButton = createActionButton("TestButton", () => () => {});

describe("createActionButton", () => {
  it("defaults to type=button", () => {
    const html = renderToStaticMarkup(<TestButton />);
    expect(html).toContain('type="button"');
  });

  it("allows the caller to override type", () => {
    const html = renderToStaticMarkup(<TestButton type="submit" />);
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('type="button"');
  });
});
