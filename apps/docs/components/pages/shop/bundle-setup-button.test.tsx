// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BundleSetupButton } from "./bundle-setup-button";
import { getExampleBundle } from "@/lib/example-bundles";

afterEach(cleanup);

it("copies a setup prompt that names the bundle and its source", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  const example = getExampleBundle("website-assistant")!;
  render(<BundleSetupButton example={example} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy setup prompt" }));
  const prompt = String(writeText.mock.calls[0]?.[0]);
  expect(prompt.startsWith("set up assistant-ui. ")).toBe(true);
  expect(prompt).toContain("/example-bundles/website-assistant/source.tar.gz");
  expect(prompt).toContain(example.title);
  expect(prompt).toContain(example.requirements);
  expect(prompt).toContain(`/components/bundles/${example.slug}`);
});
