import { describe, expect, it, vi } from "vitest";
import {
  buildRepairFeedback,
  repairLoop,
  type GenerateContext,
  type GenerateResult,
  type RenderReport,
} from "./repair";

const clean: RenderReport = {
  errors: [],
  console: [],
  blank: false,
  height: 200,
};
const broken: RenderReport = {
  errors: [
    { kind: "error", message: "Chart is not defined", line: 12, column: 3 },
  ],
  console: [
    { level: "log", message: "starting" },
    { level: "warn", message: "deprecated option" },
  ],
  blank: true,
  height: 0,
  screenshot: "data:image/png;base64,AAAA",
};

describe("buildRepairFeedback", () => {
  it("summarizes errors, blank renders, and console warnings", () => {
    const feedback = buildRepairFeedback(broken, { round: 2 });
    expect(feedback.ok).toBe(false);
    expect(feedback.round).toBe(2);
    expect(feedback.console).toEqual([
      { level: "warn", message: "deprecated option" },
    ]);
    expect(feedback.screenshot).toBe(broken.screenshot);
    expect(feedback.text).toContain(
      "- error: Chart is not defined (line 12:3)",
    );
    expect(feedback.text).toContain("rendered blank");
    expect(feedback.text).toContain("- warn: deprecated option");
    expect(feedback.text).not.toContain("starting");
    expect(feedback.text).toContain("Rendered height: 0px.");
  });

  it("can omit the screenshot and limit the console excerpt", () => {
    const many: RenderReport = {
      ...clean,
      console: Array.from({ length: 5 }, (_, i) => ({
        level: "error" as const,
        message: `e${i}`,
      })),
    };
    const feedback = buildRepairFeedback(
      { ...many, screenshot: "x" },
      { consoleLimit: 2, includeScreenshot: false },
    );
    expect(feedback.console.map((e) => e.message)).toEqual(["e3", "e4"]);
    expect(feedback).not.toHaveProperty("screenshot");
    expect(feedback.ok).toBe(true);
    expect(
      feedback.text.startsWith("The widget rendered without errors."),
    ).toBe(true);
  });
});

describe("repairLoop", () => {
  it("stops after the first accepted render", async () => {
    const generate = vi.fn(async () => "<p>ok</p>");
    const render = vi.fn(async () => clean);
    const result = await repairLoop({ generate, render });
    expect(result.ok).toBe(true);
    expect(result.rounds).toHaveLength(1);
    expect(generate).toHaveBeenCalledWith({
      round: 1,
      previousCode: undefined,
      feedback: undefined,
    });
  });

  it("feeds structured feedback back and applies edits to the previous code", async () => {
    const generate = vi.fn(
      async ({ round }: GenerateContext): Promise<GenerateResult> =>
        round === 1
          ? "<canvas></canvas><script>new Chart()</script>"
          : {
              edits: [
                {
                  old_string: "<script>",
                  new_string: '<script src="chart.js"></script><script>',
                },
              ],
            },
    );
    const render = vi.fn(async (code: string) =>
      code.includes("chart.js") ? clean : broken,
    );
    const result = await repairLoop({ generate, render });

    expect(result.ok).toBe(true);
    expect(result.rounds.map((r) => r.feedback.ok)).toEqual([false, true]);
    expect(result.code).toBe(
      '<canvas></canvas><script src="chart.js"></script><script>new Chart()</script>',
    );
    const second = generate.mock.calls[1]![0];
    expect(second.previousCode).toBe(
      "<canvas></canvas><script>new Chart()</script>",
    );
    expect(second.feedback?.errors[0]?.message).toBe("Chart is not defined");
    expect(second.feedback?.blank).toBe(true);
  });

  it("reports edits that do not apply as errors without rendering", async () => {
    const render = vi.fn(async () => broken);
    const result = await repairLoop({
      maxRounds: 2,
      generate: async ({ round }) =>
        round === 1
          ? "<p>a</p>"
          : { edits: [{ old_string: "zzz", new_string: "y" }] },
      render,
    });
    expect(render).toHaveBeenCalledTimes(1);
    expect(result.rounds[1]!.report.errors[0]!.message).toMatch(
      /^Edits were not applied: /,
    );
    expect(result.rounds[1]!.code).toBe("<p>a</p>");
  });

  it("returns the best attempt when the budget runs out", async () => {
    const reports: RenderReport[] = [
      broken,
      { ...clean, errors: [{ kind: "csp", message: "blocked" }] },
      { ...broken, errors: [...broken.errors, ...broken.errors] },
    ];
    const result = await repairLoop({
      maxRounds: 3,
      generate: async ({ round }) => `<p>${round}</p>`,
      render: async (code) => reports[Number(code.slice(3, 4)) - 1]!,
    });
    expect(result.ok).toBe(false);
    expect(result.rounds).toHaveLength(3);
    expect(result.code).toBe("<p>2</p>");
  });

  it("uses a custom acceptance rule", async () => {
    const result = await repairLoop({
      generate: async () => "<p>x</p>",
      render: async () => broken,
      accept: (report) => report.errors.length < 5,
    });
    expect(result.ok).toBe(true);
    expect(result.rounds[0]!.feedback.ok).toBe(true);
  });
});
