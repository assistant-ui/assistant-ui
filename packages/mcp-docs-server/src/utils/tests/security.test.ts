import { describe, it, expect } from "vitest";
import { sanitizePath, isValidPathCharacters } from "../security.js";

describe("sanitizePath", () => {
  describe("should reject directory traversal attempts", () => {
    const maliciousPaths = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "/etc/passwd",
      "/absolute/path",
      "docs/../../../etc/passwd",
      "valid/../../../../../../etc/passwd",
      "../",
      "..",
      ".../.../",
      "foo/../../bar",
      "./../../etc/passwd",
      "path/with/../../../traversal",
      "path/to/\0/null",
      "path\\to\\..\\..\\file",
    ];

    if (process.platform === "win32") {
      maliciousPaths.push("C:\\Windows\\System32", "\\\\server\\share");
    } else {
      maliciousPaths.push("C:\\Windows\\System32", "\\\\server\\share");
    }

    maliciousPaths.forEach((path) => {
      it(`should reject: ${path}`, () => {
        expect(() => sanitizePath(path)).toThrow();
      });
    });
  });

  describe("should reject invalid inputs", () => {
    it("should reject empty string", () => {
      expect(() => sanitizePath("")).toThrow(
        "Invalid path: Path must be a non-empty string",
      );
    });

    it("should reject null", () => {
      expect(() => sanitizePath(null as any)).toThrow(
        "Invalid path: Path must be a non-empty string",
      );
    });

    it("should reject undefined", () => {
      expect(() => sanitizePath(undefined as any)).toThrow(
        "Invalid path: Path must be a non-empty string",
      );
    });

    it("should reject numbers", () => {
      expect(() => sanitizePath(123 as any)).toThrow(
        "Invalid path: Path must be a non-empty string",
      );
    });
  });

  describe("should reject hidden files", () => {
    const hiddenPaths = [
      ".hidden",
      ".git/config",
      "docs/.secret",
      "path/to/.env",
    ];

    hiddenPaths.forEach((path) => {
      it(`should reject: ${path}`, () => {
        expect(() => sanitizePath(path)).toThrow(
          "Invalid path: Hidden files are not allowed",
        );
      });
    });
  });

  describe("should allow valid paths", () => {
    const validPaths = [
      { input: "getting-started", expected: "getting-started" },
      {
        input: "api-reference/primitives/Thread",
        expected: "api-reference/primitives/Thread",
      },
      { input: "guides/tools", expected: "guides/tools" },
      { input: "docs/index", expected: "docs/index" },
      { input: "examples/with-ai-sdk", expected: "examples/with-ai-sdk" },
      { input: "./current-dir-file", expected: "current-dir-file" },
      {
        input: "deeply/nested/path/to/file",
        expected: "deeply/nested/path/to/file",
      },
    ];

    validPaths.forEach(({ input, expected }) => {
      it(`should allow: ${input} => ${expected}`, () => {
        expect(sanitizePath(input)).toBe(expected);
      });
    });
  });

  if (process.platform === "win32") {
    describe("Windows-specific tests", () => {
      it("should reject Windows drive letters", () => {
        expect(() => sanitizePath("C:")).toThrow(
          "Invalid path: Path contains invalid Windows characters",
        );
        expect(() => sanitizePath("D:\\file")).toThrow();
      });

      it("should reject UNC paths", () => {
        expect(() => sanitizePath("\\\\server\\share")).toThrow(
          "Invalid path: Path contains invalid Windows characters",
        );
      });
    });
  }
});

describe("isValidPathCharacters", () => {
  it("should accept valid characters", () => {
    expect(isValidPathCharacters("valid-path_name")).toBe(true);
    expect(isValidPathCharacters("path/to/file.md")).toBe(true);
    expect(isValidPathCharacters("123/ABC/test")).toBe(true);
  });

  it("should reject invalid characters", () => {
    expect(isValidPathCharacters("path with spaces")).toBe(false);
    expect(isValidPathCharacters("path@with#special")).toBe(false);
    expect(isValidPathCharacters("path;with;semicolons")).toBe(false);
    expect(isValidPathCharacters("path|with|pipes")).toBe(false);
  });
});
