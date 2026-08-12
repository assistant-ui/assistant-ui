import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CERTIFICATES_DIR_ENV } from "../course-certificate.js";
import { testContext } from "./test-setup.js";

const tempDirectories: string[] = [];

afterEach(() => {
  delete process.env[CERTIFICATES_DIR_ENV];
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("course delivery smoke", () => {
  it("loads overview, step 1, and writes a Smoke Test certificate PNG", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-course-smoke-"));
    tempDirectories.push(directory);
    process.env[CERTIFICATES_DIR_ENV] = directory;

    const overview = await testContext.callTool("assistantUICourse", {});
    expect(overview.courseTitle).toBe("Build a Generative UI Assistant");
    expect(overview.steps).toHaveLength(8);

    const step1 = await testContext.callTool("assistantUICourse", { step: 1 });
    expect(step1.step).toBe(1);
    expect(step1.teachingWrapper).toContain("Here is the content for this step:");
    expect(step1.lessonMarkdown).toContain("npx create-next-app@latest");
    expect(step1.lessonMarkdown).toContain("border-[var(--foreground)]/15");

    const snippets = [
      { step: 2, needle: 'openai("gpt-5.4-nano")' },
      { step: 4, needle: 'from "../../lib/weather"' },
      { step: 6, needle: "[note.content]" },
      { step: 7, needle: "load: async () => ({ messages: [] })" },
    ] as const;
    for (const { step, needle } of snippets) {
      const lesson = await testContext.callTool("assistantUICourse", { step });
      expect(lesson.lessonMarkdown).toContain(needle);
    }

    const certificate = await testContext.callTool(
      "assistantUICourseCertificate",
      { name: "Smoke Test" },
    );
    expect(certificate.error).toBeUndefined();
    expect(certificate.name).toBe("Smoke Test");
    expect(certificate.filePath.startsWith(directory)).toBe(true);
    expect(existsSync(certificate.filePath)).toBe(true);

    const bytes = readFileSync(certificate.filePath);
    expect([...bytes.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
