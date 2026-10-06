// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it } from "vitest";
import { PreviewCodeClient } from "./preview-code";

it("lets keyboard readers switch between the live example and its code", async () => {
  render(
    <PreviewCodeClient code="const answer = 42;" codeVariant="base">
      Live example
    </PreviewCodeClient>,
  );
  const preview = screen.getByRole("tab", { name: "Preview" });
  const code = screen.getByRole("tab", { name: "Code" });
  expect(preview.getAttribute("aria-selected")).toBe("true");
  act(() => preview.focus());
  fireEvent.keyDown(preview, { key: "ArrowRight" });
  await waitFor(() => expect(code.getAttribute("aria-selected")).toBe("true"));
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
    code.id,
  );
  fireEvent.keyDown(code, { key: "ArrowLeft" });
  await waitFor(() =>
    expect(preview.getAttribute("aria-selected")).toBe("true"),
  );
  expect(screen.getByRole("tabpanel").textContent).toBe("Live example");
});
