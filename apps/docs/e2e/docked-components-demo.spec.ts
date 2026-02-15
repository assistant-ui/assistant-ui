import { expect, test } from "@playwright/test";

test.describe("docked components demo", () => {
  test("updates docked component state from conversation turns", async ({
    page,
  }) => {
    await page.goto("/docs/runtimes/custom/component-actions-and-events");

    await expect(
      page.getByRole("heading", { name: "Component Actions and Events" }),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: /Goal: launch onboarding checklist/i,
      })
      .click();

    await expect(page.getByTestId("dock-priority")).toHaveText("high");
    await expect(page.getByTestId("dock-deadline")).toHaveText("Friday");

    await page
      .getByRole("button", {
        name: /Risk: waiting on legal approval/i,
      })
      .click();

    await expect(page.getByTestId("dock-status")).toHaveText("blocked");
    await expect(page.getByTestId("dock-risk")).toHaveText(
      "waiting on legal approval",
    );

    await page
      .getByRole("button", {
        name: /Ready to ship/i,
      })
      .click();

    await expect(page.getByTestId("dock-status")).toHaveText("ready");
    await expect(page.getByTestId("dock-next-step")).toHaveText(
      "announce rollout to beta users",
    );
    await expect(page.getByTestId("dock-confidence")).toHaveText("74%");
  });

  test("supports direct interaction from docked component controls", async ({
    page,
  }) => {
    await page.goto("/docs/runtimes/custom/component-actions-and-events");

    await page.getByTestId("dock-action-raise-priority").click();
    await expect(page.getByTestId("dock-priority")).toHaveText("high");

    await page.getByTestId("dock-action-mark-blocked").click();
    await expect(page.getByTestId("dock-status")).toHaveText("blocked");
    await expect(page.getByTestId("dock-risk")).toHaveText(
      "Waiting on legal approval",
    );

    await page.getByTestId("dock-action-increase-confidence").click();
    await expect(page.getByTestId("dock-confidence")).toHaveText("52%");
  });
});
