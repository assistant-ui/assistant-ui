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

  test("uses stock assistant-ui thread and composer shell", async ({
    page,
  }) => {
    await page.goto("/internal/component-lab");

    await expect(page.getByPlaceholder("Send a message...")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send message" }),
    ).toBeVisible();
  });

  test("renders catalog components with actionable demo controls", async ({
    page,
  }) => {
    await page.goto("/internal/component-lab");

    await page.getByRole("button", { name: "json-render Patch" }).click();
    await page.getByRole("button", { name: "Send Scenario Prompt" }).click();
    await expect(
      page.getByTestId("json-render-status-board").first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("status-board-promote-release").first().click();
    await page.getByTestId("status-board-subscribe-updates").first().click();

    await page.getByRole("button", { name: "json-render Guards" }).click();
    await page.getByRole("button", { name: "Send Scenario Prompt" }).click();
    await expect(page.getByTestId("json-render-audit-log").first()).toBeVisible(
      {
        timeout: 30_000,
      },
    );
    await page.getByTestId("audit-log-ack-latest").first().click();
    await page.getByTestId("audit-log-escalate").first().click();

    await page.getByRole("button", { name: "Mixed" }).click();
    await page.getByRole("button", { name: "Send Scenario Prompt" }).click();
    await expect(page.getByTestId("json-render-metrics").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("metrics-refresh-live").first().click();
    await page.getByTestId("metrics-watch-errors").first().click();

    const eventLog = page.getByTestId("event-log");
    await expect(eventLog).toContainText("action=promote_release");
    await expect(eventLog).toContainText("event=subscribe_updates");
    await expect(eventLog).toContainText("action=ack_latest");
    await expect(eventLog).toContainText("event=escalate_incident");
    await expect(eventLog).toContainText("action=refresh_live_metrics");
    await expect(eventLog).toContainText("event=watch_errors");
  });
});
