import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  scanForImport,
  getFilesContaining,
} from "../../src/lib/utils/file-scanner";

describe("file-scanner utilities", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("scanForImport", () => {
    it("should return false when no files match", () => {
      const result = scanForImport("@assistant-ui/react", { cwd: testDir });
      expect(result).toBe(false);
    });

    it("should return true when import is found in a file", () => {
      const filePath = path.join(testDir, "test.ts");
      fs.writeFileSync(
        filePath,
        'import { Thread } from "@assistant-ui/react";',
      );

      const result = scanForImport("@assistant-ui/react", { cwd: testDir });
      expect(result).toBe(true);
    });

    it("should handle array of import patterns", () => {
      const filePath = path.join(testDir, "test.tsx");
      fs.writeFileSync(
        filePath,
        'import { useChat } from "@assistant-ui/react-ai-sdk";',
      );

      const result = scanForImport(
        ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
        { cwd: testDir },
      );
      expect(result).toBe(true);
    });

    it("should return false when none of the patterns match", () => {
      const filePath = path.join(testDir, "test.ts");
      fs.writeFileSync(filePath, 'import React from "react";');

      const result = scanForImport(
        ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
        { cwd: testDir },
      );
      expect(result).toBe(false);
    });

    it("should ignore node_modules directory", () => {
      const nodeModulesPath = path.join(testDir, "node_modules");
      fs.mkdirSync(nodeModulesPath);
      fs.writeFileSync(
        path.join(nodeModulesPath, "test.ts"),
        'import { Thread } from "@assistant-ui/react";',
      );

      const result = scanForImport("@assistant-ui/react", { cwd: testDir });
      expect(result).toBe(false);
    });

    it("should ignore build and dist directories", () => {
      const distPath = path.join(testDir, "dist");
      fs.mkdirSync(distPath);
      fs.writeFileSync(
        path.join(distPath, "test.js"),
        'import { Thread } from "@assistant-ui/react";',
      );

      const result = scanForImport("@assistant-ui/react", { cwd: testDir });
      expect(result).toBe(false);
    });

    it("should handle nested directories", () => {
      const srcPath = path.join(testDir, "src", "components");
      fs.mkdirSync(srcPath, { recursive: true });
      fs.writeFileSync(
        path.join(srcPath, "Chat.tsx"),
        'import { Thread } from "@assistant-ui/react";',
      );

      const result = scanForImport("@assistant-ui/react", { cwd: testDir });
      expect(result).toBe(true);
    });
  });

  describe("getFilesContaining", () => {
    it("should return empty array when no files match", () => {
      const result = getFilesContaining("@assistant-ui/react", {
        cwd: testDir,
      });
      expect(result).toEqual([]);
    });

    it("should return list of files containing the search string", () => {
      const file1 = path.join(testDir, "test1.ts");
      const file2 = path.join(testDir, "test2.ts");
      const file3 = path.join(testDir, "test3.ts");

      fs.writeFileSync(file1, 'import { Thread } from "@assistant-ui/react";');
      fs.writeFileSync(file2, 'import React from "react";');
      fs.writeFileSync(file3, 'import { useChat } from "@assistant-ui/react";');

      const result = getFilesContaining("@assistant-ui/react", {
        cwd: testDir,
      });

      expect(result).toHaveLength(2);
      expect(result).toContain(file1);
      expect(result).toContain(file3);
      expect(result).not.toContain(file2);
    });

    it("should handle nested directories", () => {
      const srcPath = path.join(testDir, "src");
      fs.mkdirSync(srcPath);

      const file1 = path.join(srcPath, "Chat.tsx");
      const file2 = path.join(testDir, "App.tsx");

      fs.writeFileSync(file1, 'import { Thread } from "@assistant-ui/react";');
      fs.writeFileSync(file2, 'import { Thread } from "@assistant-ui/react";');

      const result = getFilesContaining("@assistant-ui/react", {
        cwd: testDir,
      });

      expect(result).toHaveLength(2);
      expect(result).toContain(file1);
      expect(result).toContain(file2);
    });

    it("should ignore unreadable files gracefully", () => {
      const file1 = path.join(testDir, "test1.ts");
      fs.writeFileSync(file1, 'import { Thread } from "@assistant-ui/react";');

      // Create a directory with the same name as a file pattern would match
      // This tests the error handling
      const unreadableDir = path.join(testDir, "unreadable.ts");
      fs.mkdirSync(unreadableDir);

      const result = getFilesContaining("@assistant-ui/react", {
        cwd: testDir,
      });

      expect(result).toContain(file1);
      expect(result).not.toContain(unreadableDir);
    });
  });
});
