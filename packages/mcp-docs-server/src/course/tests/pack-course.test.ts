import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PACKAGE_DIR } from "../../constants.js";

const EXPECTED_LESSONS = [
  "01-meet-the-project.md",
  "02-connect-your-first-assistant.md",
  "03-guide-the-first-message.md",
  "04-add-a-weather-tool.md",
  "05-render-weather-ui.md",
  "06-share-an-editable-notepad.md",
  "07-persist-conversations.md",
  "08-revise-and-branch.md",
] as const;

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("course package contents", () => {
  it("includes course.json and all eight lessons in pnpm pack", () => {
    const packDir = mkdtempSync(join(tmpdir(), "mcp-course-pack-"));
    tempDirectories.push(packDir);

    execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: PACKAGE_DIR,
      stdio: "pipe",
      env: process.env,
    });

    const tarball = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
    expect(tarball).toBeDefined();

    const listing = execFileSync("tar", ["-tzf", join(packDir, tarball!)], {
      encoding: "utf-8",
    })
      .split("\n")
      .filter(Boolean);

    expect(listing).toContain(
      "package/course/build-generative-ui-assistant/course.json",
    );

    for (const lesson of EXPECTED_LESSONS) {
      expect(listing).toContain(
        `package/course/build-generative-ui-assistant/lessons/${lesson}`,
      );
    }

    // Course content must ship from course/, not from .docs
    expect(
      listing.some(
        (entry) =>
          entry.includes(".docs/") &&
          entry.includes("build-generative-ui-assistant"),
      ),
    ).toBe(false);
  }, 60_000);
});
