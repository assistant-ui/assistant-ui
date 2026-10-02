// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BundleSetupButton } from "./bundle-setup-button";
import { getExampleBundle } from "@/lib/example-bundles";

const setup = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ active: false }));
vi.mock("@/lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout/session-store")>()),
  useCheckoutSession: () => (session.active ? { id: "existing" } : null),
}));
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

it("explains that an existing session must finish before bundle setup", () => {
  session.active = true;
  try {
    render(
      <BundleSetupButton example={getExampleBundle("website-assistant")!} />,
    );
    expect(
      screen.queryByRole("button", { name: "Set up with your agent" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Resume current setup" })
        .getAttribute("href"),
    ).toBe("/components/setup");
    expect(
      screen.getByText(
        "Finish your current setup before starting this bundle.",
      ),
    ).toBeTruthy();
    expect(setup).not.toHaveBeenCalled();
  } finally {
    session.active = false;
  }
});
