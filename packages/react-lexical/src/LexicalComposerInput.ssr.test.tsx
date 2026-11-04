/** @vitest-environment node */
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

const { aui } = vi.hoisted(() => ({
  aui: {
    composer: { setText: () => {}, getState: () => ({ text: "" }) },
    on: () => () => {},
    subscribe: () => () => {},
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => aui,
  useAuiState: () => false,
}));

describe("LexicalComposerInput server render", () => {
  it("renders without reading Math.random", () => {
    const random = vi.spyOn(Math, "random");

    const html = renderToString(
      <LexicalComposerInput placeholder="Write a message" />,
    );

    expect(html).toContain("Write a message");
    expect(random).not.toHaveBeenCalled();
  });
});
