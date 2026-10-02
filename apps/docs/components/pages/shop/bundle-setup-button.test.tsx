// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BundleSetupButton } from "./bundle-setup-button";
import { getExampleBundle } from "@/lib/example-bundles";

const setup = vi.hoisted(() => vi.fn());
vi.mock("@/components/shared/setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../shared/setup-navigation")>()),
  useBeginSetup: () => setup,
}));
afterEach(cleanup);

it("passes the selected bundle and its source into agent setup", () => {
  const example = getExampleBundle("website-assistant")!;
  render(<BundleSetupButton example={example} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Set up with your agent" }),
  );
  expect(setup).toHaveBeenCalledWith(
    ["assistant-ui"],
    expect.stringContaining("/example-bundles/website-assistant/source.tar.gz"),
  );
  expect(setup.mock.calls[0]?.[1]).toContain(example.title);
});
