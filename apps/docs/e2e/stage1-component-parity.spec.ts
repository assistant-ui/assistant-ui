import { expect, test } from "@playwright/test";

test.describe("component state hydration docs demo", () => {
  test("replays lifecycle/state transitions deterministically", async ({
    page,
  }) => {
    await page.goto("/docs/runtimes/custom/component-state-hydration");

    await expect(
      page.getByRole("heading", {
        name: "Component State Hydration and Replay",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Run Replay" }).click();

    await expect(page.getByTestId("stage1-card-card_1-lifecycle")).toHaveText(
      "active",
    );
    await expect(page.getByTestId("stage1-card-card_1-seq")).toHaveText("2");
    await expect(page.getByTestId("stage1-card-card_1-summary")).toHaveText(
      "Ready.",
    );
    await expect(page.getByTestId("stage1-log")).toContainText(
      "dropped stale seq 1 for card_1",
    );
  });
});
