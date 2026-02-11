import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasOverlayTemplates,
  loadTemplateManifest,
  applyOverlayTemplate,
} from "./overlay-template";

function createMockProject(root: string): void {
  const baseFiles = [
    "package.json",
    "lib/workbench/component-configs.ts",
    "lib/workbench/component-registry.tsx",
    "lib/workbench/wrappers/index.ts",
    "lib/workbench/wrappers/welcome-card-sdk.tsx",
    "lib/workbench/wrappers/poi-map-sdk.tsx",
    "lib/workbench/wrappers/poi-map-input.ts",
    "lib/workbench/demo/default-props.ts",
    "lib/workbench/demo/poi-map-demo.tsx",
    "lib/workbench/demo/welcome-card-demo.tsx",
    "components/examples/index.ts",
    "components/examples/welcome-card/index.ts",
    "components/examples/poi-map/index.tsx",
  ];
  for (const file of baseFiles) {
    const filePath = path.join(root, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `// base: ${file}\n`);
  }
}

function addMinimalOverlay(root: string): void {
  const overlay: Record<string, string> = {
    "templates/minimal/template.json": JSON.stringify({
      id: "minimal",
      defaultComponent: "welcome",
      exportConfig: {
        entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
        exportName: "WelcomeCardSDK",
      },
      deleteGlobs: [
        "components/examples/poi-map",
        "lib/workbench/wrappers/poi-map-sdk.tsx",
        "lib/workbench/wrappers/poi-map-input.ts",
        "lib/workbench/demo/poi-map-demo.tsx",
      ],
    }),
    "templates/minimal/lib/workbench/component-configs.ts":
      "// overlay: minimal component-configs\n",
    "templates/minimal/lib/workbench/component-registry.tsx":
      "// overlay: minimal component-registry\n",
    "templates/minimal/lib/workbench/wrappers/index.ts":
      'export { WelcomeCardSDK } from "./welcome-card-sdk";\n',
    "templates/minimal/lib/workbench/demo/default-props.ts":
      "// overlay: minimal default-props\n",
    "templates/minimal/components/examples/index.ts":
      'export * from "./welcome-card";\n',
  };
  for (const [file, content] of Object.entries(overlay)) {
    const filePath = path.join(root, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

function addPoiMapOverlay(root: string): void {
  const overlay: Record<string, string> = {
    "templates/poi-map/template.json": JSON.stringify({
      id: "poi-map",
      defaultComponent: "poi-map",
      exportConfig: {
        entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
        exportName: "POIMapSDK",
      },
      deleteGlobs: [
        "components/examples/welcome-card",
        "lib/workbench/wrappers/welcome-card-sdk.tsx",
        "lib/workbench/demo/welcome-card-demo.tsx",
      ],
    }),
    "templates/poi-map/lib/workbench/component-configs.ts":
      "// overlay: poi-map component-configs\n",
    "templates/poi-map/lib/workbench/component-registry.tsx":
      "// overlay: poi-map component-registry\n",
    "templates/poi-map/lib/workbench/wrappers/index.ts":
      'export { POIMapSDK } from "./poi-map-sdk";\n',
    "templates/poi-map/lib/workbench/demo/default-props.ts":
      "// overlay: poi-map default-props\n",
    "templates/poi-map/components/examples/index.ts":
      'export * from "./poi-map";\n',
  };
  for (const [file, content] of Object.entries(overlay)) {
    const filePath = path.join(root, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

describe("hasOverlayTemplates", () => {
  it("returns true when templates/ directory exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      fs.mkdirSync(path.join(root, "templates"), { recursive: true });
      expect(hasOverlayTemplates(root)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns false when templates/ directory does not exist", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      expect(hasOverlayTemplates(root)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("loadTemplateManifest", () => {
  it("reads and returns a valid manifest", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      addMinimalOverlay(root);
      const manifest = loadTemplateManifest(root, "minimal");
      expect(manifest.id).toBe("minimal");
      expect(manifest.defaultComponent).toBe("welcome");
      expect(manifest.exportConfig.entryPoint).toBe(
        "lib/workbench/wrappers/welcome-card-sdk.tsx",
      );
      expect(manifest.exportConfig.exportName).toBe("WelcomeCardSDK");
      expect(manifest.deleteGlobs).toEqual([
        "components/examples/poi-map",
        "lib/workbench/wrappers/poi-map-sdk.tsx",
        "lib/workbench/wrappers/poi-map-input.ts",
        "lib/workbench/demo/poi-map-demo.tsx",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws when template directory does not exist", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      expect(() => loadTemplateManifest(root, "nonexistent")).toThrow(
        'Template overlay "nonexistent" not found',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws on missing required fields", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      const manifestDir = path.join(root, "templates", "bad");
      fs.mkdirSync(manifestDir, { recursive: true });

      // Missing id
      fs.writeFileSync(
        path.join(manifestDir, "template.json"),
        JSON.stringify({
          defaultComponent: "x",
          exportConfig: {},
          deleteGlobs: [],
        }),
      );
      expect(() => loadTemplateManifest(root, "bad")).toThrow("missing 'id'");

      // Missing defaultComponent
      fs.writeFileSync(
        path.join(manifestDir, "template.json"),
        JSON.stringify({ id: "bad", exportConfig: {}, deleteGlobs: [] }),
      );
      expect(() => loadTemplateManifest(root, "bad")).toThrow(
        "missing 'defaultComponent'",
      );

      // Missing exportConfig
      fs.writeFileSync(
        path.join(manifestDir, "template.json"),
        JSON.stringify({ id: "bad", defaultComponent: "x", deleteGlobs: [] }),
      );
      expect(() => loadTemplateManifest(root, "bad")).toThrow(
        "missing 'exportConfig'",
      );

      // Missing exportConfig.entryPoint
      fs.writeFileSync(
        path.join(manifestDir, "template.json"),
        JSON.stringify({
          id: "bad",
          defaultComponent: "x",
          exportConfig: { exportName: "X" },
          deleteGlobs: [],
        }),
      );
      expect(() => loadTemplateManifest(root, "bad")).toThrow(
        "missing 'exportConfig.entryPoint'",
      );

      // Missing deleteGlobs
      fs.writeFileSync(
        path.join(manifestDir, "template.json"),
        JSON.stringify({
          id: "bad",
          defaultComponent: "x",
          exportConfig: { entryPoint: "x.ts", exportName: "X" },
        }),
      );
      expect(() => loadTemplateManifest(root, "bad")).toThrow(
        "missing 'deleteGlobs' array",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("applyOverlayTemplate", () => {
  it("copies overlay files, deletes globs, and removes templates/", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-"));
    try {
      createMockProject(root);
      addMinimalOverlay(root);

      const manifest = applyOverlayTemplate(root, "minimal");

      // Verify manifest returned
      expect(manifest.id).toBe("minimal");
      expect(manifest.exportConfig.exportName).toBe("WelcomeCardSDK");

      // Verify overlay files were copied over base
      expect(
        fs.readFileSync(
          path.join(root, "lib/workbench/component-configs.ts"),
          "utf-8",
        ),
      ).toBe("// overlay: minimal component-configs\n");
      expect(
        fs.readFileSync(
          path.join(root, "lib/workbench/component-registry.tsx"),
          "utf-8",
        ),
      ).toBe("// overlay: minimal component-registry\n");
      expect(
        fs.readFileSync(
          path.join(root, "lib/workbench/wrappers/index.ts"),
          "utf-8",
        ),
      ).toBe('export { WelcomeCardSDK } from "./welcome-card-sdk";\n');

      // Verify deleteGlobs files were removed
      expect(
        fs.existsSync(path.join(root, "components/examples/poi-map")),
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-sdk.tsx"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-input.ts"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(path.join(root, "lib/workbench/demo/poi-map-demo.tsx")),
      ).toBe(false);

      // Verify templates/ directory was removed
      expect(fs.existsSync(path.join(root, "templates"))).toBe(false);

      // Verify non-deleted base files still exist
      expect(fs.existsSync(path.join(root, "package.json"))).toBe(true);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/welcome-card-sdk.tsx"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(root, "components/examples/welcome-card/index.ts"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("end-to-end: minimal template", () => {
  it("keeps welcome files and removes poi-map files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-e2e-"));
    try {
      createMockProject(root);
      addMinimalOverlay(root);
      addPoiMapOverlay(root);

      applyOverlayTemplate(root, "minimal");

      // Welcome files remain
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/welcome-card-sdk.tsx"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/demo/welcome-card-demo.tsx"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(root, "components/examples/welcome-card/index.ts"),
        ),
      ).toBe(true);

      // POI map files removed
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-sdk.tsx"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-input.ts"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(path.join(root, "lib/workbench/demo/poi-map-demo.tsx")),
      ).toBe(false);
      expect(
        fs.existsSync(path.join(root, "components/examples/poi-map")),
      ).toBe(false);

      // Overlay files applied
      expect(
        fs.readFileSync(
          path.join(root, "components/examples/index.ts"),
          "utf-8",
        ),
      ).toBe('export * from "./welcome-card";\n');
      expect(
        fs.readFileSync(
          path.join(root, "lib/workbench/wrappers/index.ts"),
          "utf-8",
        ),
      ).toBe('export { WelcomeCardSDK } from "./welcome-card-sdk";\n');

      // Templates dir cleaned up
      expect(fs.existsSync(path.join(root, "templates"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("end-to-end: poi-map template", () => {
  it("keeps poi-map files and removes welcome files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-overlay-e2e-"));
    try {
      createMockProject(root);
      addMinimalOverlay(root);
      addPoiMapOverlay(root);

      applyOverlayTemplate(root, "poi-map");

      // POI map files remain
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-sdk.tsx"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/poi-map-input.ts"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(root, "lib/workbench/demo/poi-map-demo.tsx")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(root, "components/examples/poi-map/index.tsx")),
      ).toBe(true);

      // Welcome files removed
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/wrappers/welcome-card-sdk.tsx"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(root, "lib/workbench/demo/welcome-card-demo.tsx"),
        ),
      ).toBe(false);
      expect(
        fs.existsSync(path.join(root, "components/examples/welcome-card")),
      ).toBe(false);

      // Overlay files applied
      expect(
        fs.readFileSync(
          path.join(root, "components/examples/index.ts"),
          "utf-8",
        ),
      ).toBe('export * from "./poi-map";\n');
      expect(
        fs.readFileSync(
          path.join(root, "lib/workbench/wrappers/index.ts"),
          "utf-8",
        ),
      ).toBe('export { POIMapSDK } from "./poi-map-sdk";\n');

      // Templates dir cleaned up
      expect(fs.existsSync(path.join(root, "templates"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
