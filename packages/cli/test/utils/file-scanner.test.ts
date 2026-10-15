import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  readProjectFiles,
  scanForImport,
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

  describe("readProjectFiles", () => {
    it("should skip entries it cannot read", () => {
      const file = path.join(testDir, "test1.ts");
      fs.writeFileSync(file, 'import { Thread } from "@assistant-ui/react";');
      fs.mkdirSync(path.join(testDir, "unreadable.ts"));

      const files = [...readProjectFiles("**/*.ts", { cwd: testDir })].map(
        ({ fullPath }) => fullPath,
      );

      expect(files).toEqual([file]);
    });
  });
});
