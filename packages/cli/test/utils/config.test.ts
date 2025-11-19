import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getConfig, saveConfig, hasConfig } from "../../src/lib/utils/config";

describe("config utilities", () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("hasConfig", () => {
    it("should return false when no config file exists", () => {
      expect(hasConfig(testDir)).toBe(false);
    });

    it("should return true when assistant-ui.json exists", () => {
      const configPath = path.join(testDir, "assistant-ui.json");
      fs.writeFileSync(configPath, "{}");

      expect(hasConfig(testDir)).toBe(true);
    });

    it("should return true when components.json exists", () => {
      const configPath = path.join(testDir, "components.json");
      fs.writeFileSync(configPath, "{}");

      expect(hasConfig(testDir)).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return null when no config file exists", () => {
      expect(getConfig(testDir)).toBeNull();
    });

    it("should read assistant-ui.json config", () => {
      const config = {
        style: "default",
        tailwind: { config: "tailwind.config.ts" },
      };
      const configPath = path.join(testDir, "assistant-ui.json");
      fs.writeFileSync(configPath, JSON.stringify(config));

      const result = getConfig(testDir);
      expect(result).toEqual(config);
    });

    it("should prioritize assistant-ui.json over components.json", () => {
      const assistantConfig = { style: "assistant-ui" };
      const componentsConfig = { style: "components" };

      fs.writeFileSync(
        path.join(testDir, "assistant-ui.json"),
        JSON.stringify(assistantConfig),
      );
      fs.writeFileSync(
        path.join(testDir, "components.json"),
        JSON.stringify(componentsConfig),
      );

      const result = getConfig(testDir);
      expect(result).toEqual(assistantConfig);
    });

    it("should return null on invalid JSON", () => {
      const configPath = path.join(testDir, "assistant-ui.json");
      fs.writeFileSync(configPath, "invalid json");

      const result = getConfig(testDir);
      expect(result).toBeNull();
    });
  });

  describe("saveConfig", () => {
    it("should create assistant-ui.json with config", () => {
      const config = {
        style: "default",
        aliases: {
          components: "@/components",
        },
      };

      saveConfig(config, testDir);

      const configPath = path.join(testDir, "assistant-ui.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
      expect(saved).toEqual(config);
    });

    it("should format JSON with proper indentation", () => {
      const config = { style: "default" };
      saveConfig(config, testDir);

      const configPath = path.join(testDir, "assistant-ui.json");
      const content = fs.readFileSync(configPath, "utf8");

      // Should be formatted with 2 spaces
      expect(content).toContain('  "style"');
    });
  });
});
