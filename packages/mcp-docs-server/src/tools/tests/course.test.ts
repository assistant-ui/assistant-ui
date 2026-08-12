import { readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { testContext } from "./test-setup.js";

describe("assistant-ui course tools", () => {
  it("returns the ordered course overview", async () => {
    const result = await testContext.callTool("assistantUICourse", {});

    expect(result.type).toBe("course");
    expect(result.course.id).toBe("build-generative-ui-assistant");
    expect(result.totalSteps).toBe(8);
    expect(result.steps.map((step: { step: number }) => step.step)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(result.teachingWrapper).toContain("real project");
  });

  it("returns full lesson markdown and metadata for a step", async () => {
    const result = await testContext.callTool("assistantUICourse", { step: 1 });

    expect(result.type).toBe("lesson");
    expect(result.step).toBe(1);
    expect(result.title).toBe("Meet the project");
    expect(result.lesson).toContain("plain Next.js App Router");
    expect(result.focusFiles).toEqual(["app/page.tsx"]);
    expect(result.lesson).toContain("must not");
    expect(result.lesson).toContain("pre-create");
  });

  it("loads every lesson in manifest order", async () => {
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const result = await testContext.callTool("assistantUICourse", { step });
      expect(result.step).toBe(step);
      expect(result.lesson).toMatch(/^# /);
      expect(result.focusFiles.length).toBeGreaterThan(0);
    }
  });

  it("writes a named PNG certificate in a temporary directory", async () => {
    const result = await testContext.callTool("assistantUICourseCertificate", {
      name: "Ada/../Lovelace",
    });

    expect(result.type).toBe("certificate");
    expect(result.name).toBe("Ada/../Lovelace");
    expect(result.path.startsWith(tmpdir())).toBe(true);
    expect(result.path).not.toContain("Ada");
    const png = await readFile(result.path);
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    await rm(dirname(result.path), { recursive: true, force: true });
  });
});
