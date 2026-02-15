import { expect, test } from "@playwright/test";

test.describe("internal component lab", () => {
  test("runs scenario matrix and reports pass rows", async ({ page }) => {
    await page.goto("/internal/component-lab");

    await page.getByTestId("run-matrix").click();
    await expect(page.getByTestId("matrix-summary")).toBeVisible({
      timeout: 90_000,
    });

    const scenarioRows = [
      "matrix-component-part",
      "matrix-json-render-patch",
      "matrix-json-render-guards",
      "matrix-mixed",
      "matrix-chaos",
      "matrix-json-patch-semantics",
      "matrix-missing-instance",
      "matrix-parent-graph",
    ] as const;

    for (const rowId of scenarioRows) {
      await expect(page.getByTestId(rowId)).toContainText("PASS");
    }
  });

  test("switches catalog modes and renders fallback/override paths", async ({
    page,
  }) => {
    await page.goto("/internal/component-lab");

    await page.getByLabel("Catalog Mode").selectOption("fallback-only");
    await page.getByRole("button", { name: "Mixed" }).click();
    await page.getByRole("button", { name: "Send Scenario Prompt" }).click();

    await expect(page.getByTestId("json-render-fallback").first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Catalog Mode").selectOption("override");
    await page.getByRole("button", { name: "Send Scenario Prompt" }).click();

    await expect(page.getByTestId("json-render-override").first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
