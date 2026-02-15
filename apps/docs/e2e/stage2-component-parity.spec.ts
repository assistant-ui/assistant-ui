import { expect, test } from "@playwright/test";

test.describe("stage 2 component parity docs demo", () => {
  test("replays invoke ack/reject and emit routing deterministically", async ({
    page,
  }) => {
    await page.goto("/docs/runtimes/custom/stage2-component-parity");

    await expect(
      page.getByRole("heading", { name: "Stage 2 Component Parity" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Run Stage 2 Replay" }).click();

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
