import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { info, satisfiesRange } from "../../src/commands/info";

function writePackage(
  root: string,
  name: string,
  packageJson: Record<string, unknown>,
) {
  const directory = path.join(root, "node_modules", ...name.split("/"));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ name, ...packageJson }),
  );
}

describe("satisfiesRange", () => {
  it.each([
    ["18.3.1", "^18 || ^19"],
    ["19.2.0", "^18 || ^19"],
    ["7.0.0", "^5 || ^6 || ^7"],
    ["0.15.4", "^0.15.0"],
    ["0.5.0", ">=0.5.0"],
  ])("accepts %s for %s", (version, range) => {
    expect(satisfiesRange(version, range)).toBe(true);
  });

  it.each([
    ["20.0.0", "^18 || ^19"],
    ["8.0.0", "^5 || ^6 || ^7"],
    ["0.14.9", "^0.15.0"],
    ["0.16.0", "^0.15.0"],
    ["0.4.9", ">=0.5.0"],
  ])("rejects %s for %s", (version, range) => {
    expect(satisfiesRange(version, range)).toBe(false);
  });

  it.each(["*", "any"])("accepts the unrestricted %s range", (range) => {
    expect(satisfiesRange("20.0.0", range)).toBe(true);
  });
});

describe("info command", () => {
  it("includes declared assistant-ui integrations and their peer warnings", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-info-"));
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      fs.writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({
          name: "fixture",
          dependencies: {
            "@assistant-ui/react-mcp": "0.0.17",
            "assistant-stream": "0.3.25",
            react: "20.0.0",
          },
          devDependencies: {
            "@assistant-ui/react-generative-ui": "0.0.7",
          },
        }),
      );
      writePackage(root, "@assistant-ui/react-mcp", {
        version: "0.0.17",
        peerDependencies: { react: "^18 || ^19" },
      });
      writePackage(root, "@assistant-ui/react-generative-ui", {
        version: "0.0.7",
      });
      writePackage(root, "assistant-stream", { version: "0.3.25" });
      writePackage(root, "react", { version: "20.0.0" });

      await info.parseAsync(["node", "info", "--cwd", root], {
        from: "node",
      });

      const output = consoleLog.mock.calls.flat().join("\n");
      expect(output).toContain("@assistant-ui/react-mcp");
      expect(output).toContain("@assistant-ui/react-generative-ui");
      expect(output).toContain("assistant-stream");
      expect(output).toContain(
        "@assistant-ui/react-mcp requires react ^18 || ^19, found 20.0.0",
      );
    } finally {
      consoleLog.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
