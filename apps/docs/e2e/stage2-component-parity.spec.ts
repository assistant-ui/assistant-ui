import { expect, test } from "@playwright/test";

test.describe("component action/event docs demo", () => {
  test("replays invoke ack/reject and emit routing deterministically", async ({
    page,
  }) => {
    await page.goto("/docs/runtimes/custom/component-actions-and-events");

    await expect(
      page.getByRole("heading", { name: "Component Actions and Events" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Run Replay" }).click();

    await expect(
      page.getByTestId("stage2-card-card_1-invoke-ok"),
    ).toContainText('"ok":true');
    await expect(
      page.getByTestId("stage2-card-card_1-invoke-error"),
    ).toHaveText('backend rejected action "fail"');
    await expect(page.getByTestId("stage2-card-card_1-last-emit")).toHaveText(
      'selected:{"tab":"metrics"}',
    );
    await expect(page.getByTestId("stage2-log")).toContainText(
      "invoke fail rejected",
    );
  });
});
