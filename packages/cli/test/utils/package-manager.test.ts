import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  isPackageInstalled,
  getInstallCommand,
} from "../../src/lib/utils/package-manager";

describe("package-manager utilities", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("isPackageInstalled", () => {
    it("should return false when package.json does not exist", () => {
      expect(isPackageInstalled("test-package", testDir)).toBe(false);
    });

    it("should return false when package is not in dependencies", () => {
      const packageJson = {
        dependencies: {
          "other-package": "^1.0.0",
        },
      };
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      expect(isPackageInstalled("test-package", testDir)).toBe(false);
    });

    it("should return true when package is in dependencies", () => {
      const packageJson = {
        dependencies: {
          "test-package": "^1.0.0",
        },
      };
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      expect(isPackageInstalled("test-package", testDir)).toBe(true);
    });

    it("should return true when package is in devDependencies", () => {
      const packageJson = {
        devDependencies: {
          "test-package": "^1.0.0",
        },
      };
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      expect(isPackageInstalled("test-package", testDir)).toBe(true);
    });

    it("should return true when package exists in node_modules", () => {
      const nodeModulesPath = path.join(
        testDir,
        "node_modules",
        "test-package",
      );
      fs.mkdirSync(nodeModulesPath, { recursive: true });

      expect(isPackageInstalled("test-package", testDir)).toBe(true);
    });

    it("should handle scoped packages correctly", () => {
      const packageJson = {
        dependencies: {
          "@scope/test-package": "^1.0.0",
        },
      };
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      expect(isPackageInstalled("@scope/test-package", testDir)).toBe(true);
    });
  });

  describe("getInstallCommand", () => {
    it("should return an install command", async () => {
      const cmd = await getInstallCommand("test-package", testDir);

      expect(cmd.args).toContain("test-package");
      expect(["npm", "pnpm", "yarn", "bun"]).toContain(cmd.command);
    });

    it("should include package name in command", async () => {
      const cmd = await getInstallCommand("my-awesome-package", testDir);
      expect(cmd.args).toContain("my-awesome-package");
    });
  });
});
