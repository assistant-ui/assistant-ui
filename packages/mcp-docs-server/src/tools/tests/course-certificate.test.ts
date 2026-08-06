import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CERTIFICATES_DIR_ENV,
  certificateInputSchema,
} from "../course-certificate.js";
import { testContext } from "./test-setup.js";

const tempDirectories: string[] = [];

afterEach(() => {
  delete process.env[CERTIFICATES_DIR_ENV];
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("assistantUICourseCertificate", () => {
  it("writes a certificate into an injectable temp directory", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-cert-tool-"));
    tempDirectories.push(directory);
    process.env[CERTIFICATES_DIR_ENV] = directory;

    const result = await testContext.callTool("assistantUICourseCertificate", {
      name: "Harbor Course Eval",
    });

    expect(result.error).toBeUndefined();
    expect(result.name).toBe("Harbor Course Eval");
    expect(result.courseTitle).toBe("Build a Generative UI Assistant");
    expect(result.certificateId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.filePath.startsWith(directory)).toBe(true);
    expect(existsSync(result.filePath)).toBe(true);
  });

  it("returns a structured error for an empty name", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-cert-tool-"));
    tempDirectories.push(directory);
    process.env[CERTIFICATES_DIR_ENV] = directory;

    const result = await testContext.callTool("assistantUICourseCertificate", {
      name: "   ",
    });
    expect(result.error).toBe("Failed to write course certificate");
    expect(result.message).toMatch(/non-empty/i);
  });

  it("rejects unknown fields such as courseId", async () => {
    expect(
      certificateInputSchema.safeParse({
        name: "Ada",
        courseId: "other-course",
      }).success,
    ).toBe(false);

    const result = await testContext.callTool("assistantUICourseCertificate", {
      name: "Ada",
      courseId: "other-course",
    });
    expect(result.error).toBe("Failed to write course certificate");
    expect(result.message).toMatch(/unrecognized key/i);
  });
});
