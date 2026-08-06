import { describe, expect, it } from "vitest";
import { getCertificatesDirectory } from "../cache-paths.js";

describe("getCertificatesDirectory", () => {
  it("uses XDG cache on Linux", () => {
    expect(
      getCertificatesDirectory("linux", { HOME: "/home/learner" }, "/home/learner"),
    ).toBe("/home/learner/.cache/assistant-ui/course/certificates");
  });

  it("uses Library/Caches on macOS", () => {
    expect(
      getCertificatesDirectory("darwin", {}, "/Users/learner"),
    ).toBe("/Users/learner/Library/Caches/assistant-ui/course/certificates");
  });

  it("uses LOCALAPPDATA on Windows", () => {
    expect(
      getCertificatesDirectory(
        "win32",
        { LOCALAPPDATA: "C:\\Users\\learner\\AppData\\Local" },
        "C:\\Users\\learner",
      ),
    ).toMatch(/assistant-ui[\\/]+course[\\/]+certificates$/);
  });
});
