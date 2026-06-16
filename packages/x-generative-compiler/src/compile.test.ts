import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as nodePath from "node:path";
import { describe, it, expect, vi } from "vitest";
import {
  compileGenerative,
  isGenerativeModule,
  GenerativeCompileError,
} from "./compile";

const minimalSource = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  weather: {
    execute: async () => 1,
  },
});
`;

function createPackage(
  root: string,
  name: string,
  packageJson: Record<string, unknown> = {},
): string {
  const packageRoot = nodePath.join(root, "node_modules", ...name.split("/"));
  const distRoot = nodePath.join(packageRoot, "dist");
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(nodePath.join(distRoot, "index.js"), "export {};\n");
  writeFileSync(
    nodePath.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.0.0",
        type: "module",
        exports: {
          ".": "./dist/index.js",
        },
        ...packageJson,
      },
      null,
      2,
    ),
  );
  return packageRoot;
}

function createCompatibilityFixture(range: string | null): string {
  const appRoot = mkdtempSync(
    nodePath.join(tmpdir(), "aui-generative-compiler-"),
  );
  const srcRoot = nodePath.join(appRoot, "src");
  mkdirSync(srcRoot, { recursive: true });
  const filename = nodePath.join(srcRoot, "toolkit.tsx");
  writeFileSync(filename, minimalSource);

  const reactRoot = createPackage(appRoot, "@assistant-ui/react", {
    dependencies: {
      "@assistant-ui/core": "0.0.0",
    },
  });
  createPackage(reactRoot, "@assistant-ui/core", {
    version: "0.2.10",
    ...(range
      ? {
          optionalDevDependencies: {
            "@assistant-ui/x-generative-compiler": range,
          },
        }
      : {}),
  });

  return filename;
}

/**
 * Writes a child module to disk next to a (not-yet-written) `toolkit.tsx` and
 * returns the parent's filename, so a parent compiled from a string can resolve
 * `./tools/child` relative to it. Used to exercise cross-file toolkit spreads.
 */
function createMergeFixture(childSource: string): string {
  const appRoot = mkdtempSync(nodePath.join(tmpdir(), "aui-generative-merge-"));
  const toolsRoot = nodePath.join(appRoot, "src", "tools");
  mkdirSync(toolsRoot, { recursive: true });
  writeFileSync(nodePath.join(toolsRoot, "weather.tsx"), childSource);
  return nodePath.join(appRoot, "src", "toolkit.tsx");
}

function createMultiMergeFixture(files: Record<string, string>): string {
  const appRoot = mkdtempSync(
    nodePath.join(tmpdir(), "aui-generative-merge-many-"),
  );
  const srcRoot = nodePath.join(appRoot, "src");
  for (const [relativePath, source] of Object.entries(files)) {
    const file = nodePath.join(srcRoot, relativePath);
    mkdirSync(nodePath.dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  return nodePath.join(srcRoot, "toolkit.tsx");
}

/**
 * Like {@link createMergeFixture}, but also writes a (JSONC) `tsconfig.json`
 * with a `@/*` path alias so alias resolution can be exercised. The child lives
 * at `src/tools/weather.tsx` and `@/*` maps to `./src/*`.
 */
function createAliasMergeFixture(childSource: string): string {
  const filename = createMergeFixture(childSource);
  const appRoot = nodePath.dirname(nodePath.dirname(filename));
  writeFileSync(
    nodePath.join(appRoot, "tsconfig.json"),
    `{
  // path aliases
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
  }
}`,
  );
  return filename;
}

const generativeChild = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  get_weather: {
    execute: async () => 1,
    render: () => null,
  },
});
`;

const source = `"use generative";
import { z } from "zod";
import { db } from "@/db";
import { track } from "@/analytics";
import { Chart } from "@/ui/chart";
import { defineToolkit } from "@assistant-ui/react";

export default defineToolkit({
  weather: {
    description: "Show the weather.",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.weather.get(city),
    render: (props) => <Chart data={props} />,
  },
  toast: {
    description: "Show a toast.",
    parameters: z.object({ msg: z.string() }),
    execute: async ({ msg }) => {
      "use client";
      return track(msg);
    },
    render: (props) => <div>{props.msg}</div>,
  },
});
`;

const server = () => compileGenerative(source, { target: "server" }).code;
const client = () => compileGenerative(source, { target: "client" }).code;

describe("compileGenerative — core/compiler compatibility", () => {
  it("allows a compiler version that satisfies core's optionalDevDependencies range", () => {
    const filename = createCompatibilityFixture(">=0.0.0");

    expect(() =>
      compileGenerative(minimalSource, { target: "server", filename }),
    ).not.toThrow();
  });

  it("throws when core requires a different compiler range", () => {
    const filename = createCompatibilityFixture("<0.0.3");

    expect(() =>
      compileGenerative(minimalSource, { target: "server", filename }),
    ).toThrow(/requires @assistant-ui\/x-generative-compiler <0\.0\.3/);
  });

  it("skips the check for older core packages without compatibility metadata", () => {
    const filename = createCompatibilityFixture(null);

    expect(() =>
      compileGenerative(minimalSource, { target: "server", filename }),
    ).not.toThrow();
  });

  it("wraps malformed package metadata in a compile error", () => {
    const filename = createCompatibilityFixture(">=0.0.0");
    const packageJsonPath = nodePath.join(
      nodePath.dirname(filename),
      "..",
      "node_modules",
      "@assistant-ui",
      "react",
      "package.json",
    );
    writeFileSync(packageJsonPath, "{");

    expect(() =>
      compileGenerative(minimalSource, { target: "server", filename }),
    ).toThrow(GenerativeCompileError);
  });
});

describe("compileGenerative — server target", () => {
  const code = server();

  it("keeps the schema", () => {
    expect(code).toContain('import { z } from "zod"');
    expect(code).toContain("z.object");
    expect(code).toContain('description: "Show the weather."');
  });

  it("keeps a backend execute and guards it with server-only", () => {
    expect(code).toContain('import "server-only"');
    expect(code).toContain("db.weather.get");
    expect(code).toContain('import { db } from "@/db"');
  });

  it("writes the inferred type back onto each tool", () => {
    expect(code).toContain('type: "backend"'); // weather: execute, no "use client"
    expect(code).toContain('type: "frontend"'); // toast: execute + "use client"
  });

  it("does not mark server tools with backend defaults", () => {
    expect(code).not.toContain("unstable_backendDefault");
  });

  it("drops all render and its client imports", () => {
    expect(code).not.toContain("Chart");
    expect(code).not.toContain("<div");
    expect(code).not.toMatch(/render\s*:/);
  });

  it("drops a frontend execute and its client imports", () => {
    expect(code).not.toContain("track");
    expect(code).not.toContain("@/analytics");
  });

  it("strips the use generative directive and adds no use client", () => {
    expect(code).not.toContain("use generative");
    expect(code).not.toContain("use client");
  });
});

describe("compileGenerative — client target", () => {
  const code = client();

  it("marks the module use client and keeps render", () => {
    expect(code.trimStart().startsWith('"use client"')).toBe(true);
    expect(code).toContain("<Chart");
    expect(code).toContain("<div");
    expect(code).toContain('import { Chart } from "@/ui/chart"');
  });

  it("keeps the schema for parsing", () => {
    expect(code).toContain('import { z } from "zod"');
    expect(code).toContain("z.object");
  });

  it("keeps a frontend execute (and drops its `use client` marker)", () => {
    expect(code).toContain("track(msg)");
    expect(code).toContain("@/analytics");
    // exactly one "use client" — the module directive, not the execute body's
    expect(code.match(/use client/g)?.length).toBe(1);
  });

  it("writes the inferred type back onto each tool", () => {
    expect(code).toContain('type: "backend"'); // weather (schema-only on client)
    expect(code).toContain('type: "frontend"'); // toast
  });

  it("marks generated frontend tools with backend parameter defaults", () => {
    expect(code).toContain("unstable_backendDefault: {");
    expect(code).toContain("parameters: true");
  });

  it("marks generated human tools with backend parameter defaults", () => {
    const src = `"use generative";
import { defineToolkit, humanTool } from "@assistant-ui/react";
export default defineToolkit({
  ask: {
    parameters: { type: "object", properties: {} },
    execute: humanTool(),
    render: () => null,
  },
});
`;

    const code = compileGenerative(src, { target: "client" }).code;
    expect(code).toContain('type: "human"');
    expect(code).toContain("unstable_backendDefault: {");
    expect(code).toContain("parameters: true");
  });

  it("drops a backend execute and its server-only imports", () => {
    expect(code).not.toContain("db.weather.get");
    expect(code).not.toContain("@/db");
    expect(code).not.toContain("server-only");
  });
});

describe("compileGenerative — generative UI library", () => {
  const generative = `"use generative";
import { z } from "zod";
import { Chart } from "@/ui/chart";
import { defineToolkit } from "@assistant-ui/react";
import {
  JSONGenerativeUI,
  defineGenerativeComponents,
} from "@assistant-ui/react-generative-ui";

const generative = new JSONGenerativeUI({
  library: defineGenerativeComponents({
    Chart: {
      description: "A chart.",
      properties: z.object({ data: z.array(z.number()) }),
      render: (props) => <Chart {...props} />,
    },
  }),
});

export default defineToolkit({
  present: generative.present(),
  prompt_user: generative.promptUser(),
});
`;

  it("keeps the schema and the JSONGenerativeUI instance on the server, drops render", () => {
    const code = compileGenerative(generative, { target: "server" }).code;
    expect(code).toContain("new JSONGenerativeUI");
    expect(code).toContain("generative.present()");
    expect(code).toContain("generative.promptUser()");
    expect(code).toContain("z.object");
    expect(code).toContain('description: "A chart."');
    // render and its client-only import are gone on the server
    expect(code).not.toMatch(/render\s*:/);
    expect(code).not.toContain("Chart }"); // the @/ui/chart import specifier
    expect(code).not.toContain("@/ui/chart");
    expect(code).not.toContain("<Chart");
    // the markers themselves are unwrapped and their import pruned
    expect(code).not.toContain("defineToolkit");
    expect(code).not.toContain("defineGenerativeComponents");
    // no backend execute anywhere → no server-only guard, no use client
    expect(code).not.toContain("server-only");
    expect(code).not.toContain("use client");
  });

  it("keeps render (and marks use client) on the client", () => {
    const code = compileGenerative(generative, { target: "client" }).code;
    expect(code.trimStart().startsWith('"use client"')).toBe(true);
    expect(code).toContain("<Chart");
    expect(code).toContain('import { Chart } from "@/ui/chart"');
    expect(code).toContain("new JSONGenerativeUI");
    expect(code).toContain("generative.present()");
    // the JSONGenerativeUI import survives on both builds
    expect(code).toContain("@assistant-ui/react-generative-ui");
    expect(code).not.toContain("defineGenerativeComponents");
  });

  it("rejects an unknown method on a JSONGenerativeUI instance", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { JSONGenerativeUI } from "@assistant-ui/react-generative-ui";
const ui = new JSONGenerativeUI({ library: {} });
export default defineToolkit({ present: ui.notARealMethod() });`;
    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /inline object literal/,
    );
  });

  it("rejects a method call on an unknown (non-JSONGenerativeUI) object", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { other } from "@/other";
export default defineToolkit({ present: other.present() });`;
    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /inline object literal/,
    );
  });

  it("does not treat nested JSONGenerativeUI instances as module-scope instances", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { JSONGenerativeUI } from "@assistant-ui/react-generative-ui";
function create() {
  const ui = new JSONGenerativeUI({ library: {} });
  return ui;
}
export default defineToolkit({ present: ui.present() });`;
    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /inline object literal/,
    );
  });

  it("allows a generative tool alongside an inline tool", () => {
    const src = `"use generative";
import { z } from "zod";
import { db } from "@/db";
import { defineToolkit } from "@assistant-ui/react";
import { JSONGenerativeUI, defineGenerativeComponents } from "@assistant-ui/react-generative-ui";
const ui = new JSONGenerativeUI({ library: defineGenerativeComponents({ Box: { description: "b", properties: z.object({}), render: () => null } }) });
export default defineToolkit({
  present: ui.present(),
  weather: {
    description: "w",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.get(city),
    render: () => null,
  },
});`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("ui.present()");
    expect(server).toContain("db.get");
    expect(server).toContain('type: "backend"');
    expect(server).toContain("server-only");
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("ui.present()");
    expect(client).not.toContain("db.get");
    expect(client.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("splits an unstable_interactableTool entry: client keeps render, server drops it", () => {
    const src = `"use generative";
import { z } from "zod";
import { Notepad } from "@/ui/notepad";
import { defineToolkit, unstable_interactableTool } from "@assistant-ui/react";
export default defineToolkit({
  notepad: unstable_interactableTool({
    description: "A notepad.",
    stateSchema: z.object({ content: z.string() }),
    render: (props) => <Notepad {...props} />,
  }),
});`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("unstable_interactableTool({");
    expect(server).toContain('description: "A notepad."');
    expect(server).toContain("z.object");
    expect(server).not.toMatch(/render\s*:/);
    expect(server).not.toContain("@/ui/notepad");
    expect(server).not.toContain("server-only");
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client.trimStart().startsWith('"use client"')).toBe(true);
    expect(client).toContain("<Notepad");
    expect(client).toContain('import { Notepad } from "@/ui/notepad"');
  });

  it("rejects unstable_interactableTool not imported from an assistant-ui package", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { unstable_interactableTool } from "@/my-tools";
export default defineToolkit({ notepad: unstable_interactableTool({ render: () => null }) });`;
    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /inline object literal/,
    );
  });

  it("routes provider tool config", () => {
    const src = `"use generative";
import { defineToolkit, providerTool } from "@assistant-ui/react";
export default defineToolkit({
  web_search: {
    execute: providerTool({
      providerId: "openai.web_search_preview",
      args: { searchContextSize: "low" },
      providerOptions: { openai: { rankingOptions: { scoreThreshold: 0.5 } } },
    }),
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "provider"');
    expect(server).toContain("openai.web_search_preview");
    expect(server).toContain("searchContextSize");
    expect(server).toContain("providerOptions");
    expect(server).not.toContain("providerTool");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "provider"');
    expect(client).toContain("openai.web_search_preview");
    expect(client).toContain("providerOptions");
    expect(client).not.toContain("providerTool");
  });

  it("routes flat toolkit tools and preserves spread MCP config", () => {
    const src = `"use generative";
import { z } from "zod";
import { db } from "@/db";
import { defineMcpToolkit, defineToolkit } from "@assistant-ui/react";
const mcp = defineMcpToolkit({
  docs: { type: "http", url: "http://localhost:3001/mcp" },
});
export default defineToolkit({
  ...mcp,
  weather: {
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.get(city),
    render: () => null,
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("...mcp");
    expect(server).toContain("db.get");
    expect(server).not.toContain("render");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("...mcp");
    expect(client).toContain("render");
    expect(client).not.toContain("db.get");
  });

  it("allows spreading a compiler-visible local toolkit", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { db } from "@/db";
const base = defineToolkit({
  get_weather: {
    execute: async () => db.getWeather(),
    render: () => null,
  },
});
export default defineToolkit({
  ...base,
  get_time: {
    execute: async () => db.getTime(),
    render: () => null,
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("...base");
    expect(server).toContain("db.getWeather");
    expect(server).toContain("db.getTime");
    expect(server).not.toContain("render");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("...base");
    expect(client).not.toContain("db.getWeather");
    expect(client).not.toContain("db.getTime");
    expect(client).toContain("render");
  });

  it("allows directly spreading an MCP toolkit fragment", () => {
    const src = `"use generative";
import { defineMcpToolkit, defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  ...defineMcpToolkit({
    docs: { type: "http", url: "http://localhost:3001/mcp" },
  }),
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("defineMcpToolkit");
    expect(server).toContain("docs");
  });

  it("rejects opaque toolkit spreads", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { backendTools } from "@/backend-tools";
export default defineToolkit({
  ...backendTools,
});`;

    expect(() => compileGenerative(src, { target: "client" })).toThrow(
      /compiler-visible toolkit spread/,
    );
  });

  it("does not treat nested toolkit declarations as compiler-visible spreads", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
function createToolkit() {
  const base = defineToolkit({
    get_weather: {
      execute: async () => 1,
      render: () => null,
    },
  });
  return base;
}
export default defineToolkit({
  ...base,
});`;

    expect(() => compileGenerative(src, { target: "client" })).toThrow(
      /compiler-visible toolkit spread/,
    );
  });

  it("allows spreading the default import of a generative module", () => {
    const filename = createMergeFixture(generativeChild);
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather";
export default defineToolkit({
  ...weatherTools,
});`;

    const server = compileGenerative(src, { target: "server", filename }).code;
    expect(server).toContain("...weatherTools");
    expect(server).toContain('from "./tools/weather"');

    const client = compileGenerative(src, { target: "client", filename }).code;
    expect(client).toContain("...weatherTools");
    expect(client).toContain('from "./tools/weather"');
  });

  it("allows unique tool names across more than two imported generative spreads", () => {
    const filename = createMultiMergeFixture({
      "tools/weather.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  get_weather: { execute: async () => 1, render: () => null },
});`,
      "tools/database.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  query_db: { execute: async () => 1, render: () => null },
});`,
      "tools/calendar.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  create_event: { execute: async () => 1, render: () => null },
});`,
      "tools/email.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  send_email: { execute: async () => 1, render: () => null },
});`,
    });
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather";
import databaseTools from "./tools/database";
import calendarTools from "./tools/calendar";
import emailTools from "./tools/email";
export default defineToolkit({
  ...weatherTools,
  ...databaseTools,
  ...calendarTools,
  ...emailTools,
});`;

    const client = compileGenerative(src, { target: "client", filename }).code;
    expect(client).toContain("...weatherTools");
    expect(client).toContain("...databaseTools");
    expect(client).toContain("...calendarTools");
    expect(client).toContain("...emailTools");
  });

  it("warns about duplicate tool names across more than two imported generative spreads", () => {
    const filename = createMultiMergeFixture({
      "tools/weather.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  get_weather: { execute: async () => 1, render: () => null },
  search: { execute: async () => 1, render: () => null },
});`,
      "tools/database.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  query_db: { execute: async () => 1, render: () => null },
});`,
      "tools/calendar.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  search: { execute: async () => 1, render: () => null },
});`,
      "tools/email.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  send_email: { execute: async () => 1, render: () => null },
});`,
    });
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather";
import databaseTools from "./tools/database";
import calendarTools from "./tools/calendar";
import emailTools from "./tools/email";
export default defineToolkit({
  ...weatherTools,
  ...databaseTools,
  ...calendarTools,
  ...emailTools,
});`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const client = compileGenerative(src, {
        target: "client",
        filename,
      }).code;

      expect(client).toContain("...weatherTools");
      expect(client).toContain("...databaseTools");
      expect(client).toContain("...calendarTools");
      expect(client).toContain("...emailTools");
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("[assistant-ui/use-generative]"),
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("does not reuse imported toolkit names across compile calls", () => {
    const filename = createMultiMergeFixture({
      "tools/weather.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  get_weather: { execute: async () => 1, render: () => null },
});`,
      "tools/calendar.tsx": `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  search: { execute: async () => 1, render: () => null },
});`,
    });
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather";
import calendarTools from "./tools/calendar";
export default defineToolkit({
  ...weatherTools,
  ...calendarTools,
});`;

    compileGenerative(src, { target: "client", filename });
    writeFileSync(
      nodePath.join(nodePath.dirname(filename), "tools", "weather.tsx"),
      `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  search: { execute: async () => 1, render: () => null },
});`,
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      compileGenerative(src, { target: "client", filename });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("warns about duplicate tool names between local toolkit spreads", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
const weatherTools = defineToolkit({
  get_weather: { execute: async () => 1, render: () => null },
  search: { execute: async () => 1, render: () => null },
});
const databaseTools = defineToolkit({
  query_db: { execute: async () => 1, render: () => null },
});
const calendarTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
});
const emailTools = defineToolkit({
  send_email: { execute: async () => 1, render: () => null },
});
export default defineToolkit({
  ...weatherTools,
  ...databaseTools,
  ...calendarTools,
  ...emailTools,
});`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const client = compileGenerative(src, { target: "client" }).code;

      expect(client).toContain("...weatherTools");
      expect(client).toContain("...databaseTools");
      expect(client).toContain("...calendarTools");
      expect(client).toContain("...emailTools");
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[assistant-ui/use-generative] Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("warns once across server and client compiles", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
const weatherTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
});
const calendarTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
});
export default defineToolkit({
  ...weatherTools,
  ...calendarTools,
});`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      compileGenerative(src, { target: "server" });
      compileGenerative(src, { target: "client" });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("warns about duplicate names through nested local toolkit spreads", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
const baseTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
});
const weatherTools = defineToolkit({
  ...baseTools,
  get_weather: { execute: async () => 1, render: () => null },
});
const calendarTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
});
export default defineToolkit({
  ...weatherTools,
  ...calendarTools,
});`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      compileGenerative(src, { target: "client" });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn again when spreading a fragment with an internal duplicate", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
const baseTools = defineToolkit({
  search: { execute: async () => 1, render: () => null },
  search: { execute: async () => 2, render: () => null },
});
export default defineToolkit({
  ...baseTools,
});`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      compileGenerative(src, { target: "client" });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Duplicate tool name "search" while composing toolkits. ' +
            "JavaScript object spread keeps the last definition.",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects spreading the default import of a non-generative module", () => {
    const filename = createMergeFixture(
      `export default { get_weather: { execute: async () => 1 } };\n`,
    );
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather";
export default defineToolkit({
  ...weatherTools,
});`;

    expect(() =>
      compileGenerative(src, { target: "client", filename }),
    ).toThrow(/compiler-visible toolkit spread/);
  });

  it("rejects spreading a named import even from a generative module", () => {
    const filename = createMergeFixture(generativeChild);
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { weatherTools } from "./tools/weather";
export default defineToolkit({
  ...weatherTools,
});`;

    expect(() =>
      compileGenerative(src, { target: "client", filename }),
    ).toThrow(/compiler-visible toolkit spread/);
  });

  it("resolves a tsconfig path alias when spreading a generative module", () => {
    const filename = createAliasMergeFixture(generativeChild);
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "@/tools/weather";
export default defineToolkit({
  ...weatherTools,
});`;

    const client = compileGenerative(src, { target: "client", filename }).code;
    expect(client).toContain("...weatherTools");
    expect(client).toContain('from "@/tools/weather"');
  });

  it("prefers the most specific tsconfig path alias", () => {
    const appRoot = mkdtempSync(
      nodePath.join(tmpdir(), "aui-generative-alias-spec-"),
    );
    mkdirSync(nodePath.join(appRoot, "src", "tools"), { recursive: true });
    mkdirSync(nodePath.join(appRoot, "generated"), { recursive: true });
    // The broader `@/*` alias would resolve here — a non-generative module.
    writeFileSync(
      nodePath.join(appRoot, "src", "tools", "weather.tsx"),
      `export default { get_weather: { execute: async () => 1 } };\n`,
    );
    // The more specific `@/tools/*` alias resolves to the generative module.
    writeFileSync(
      nodePath.join(appRoot, "generated", "weather.tsx"),
      generativeChild,
    );
    writeFileSync(
      nodePath.join(appRoot, "tsconfig.json"),
      `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/tools/*": ["./generated/*"]
    }
  }
}`,
    );
    const filename = nodePath.join(appRoot, "src", "toolkit.tsx");
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "@/tools/weather";
export default defineToolkit({
  ...weatherTools,
});`;

    // `@/tools/*` is more specific than `@/*`, so it wins and the spread is the
    // generative module (allowed) rather than the non-generative `@/*` target.
    const client = compileGenerative(src, { target: "client", filename }).code;
    expect(client).toContain("...weatherTools");
  });

  it("resolves a .js specifier to its .tsx source when spreading", () => {
    const filename = createMergeFixture(generativeChild);
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import weatherTools from "./tools/weather.js";
export default defineToolkit({
  ...weatherTools,
});`;

    const client = compileGenerative(src, { target: "client", filename }).code;
    expect(client).toContain("...weatherTools");
  });

  it("allows defineMcpToolkit as the default export", () => {
    const src = `"use generative";
import { defineMcpToolkit } from "@assistant-ui/react";
export default defineMcpToolkit({
  docs: { type: "http", url: "https://mcp.example.com/mcp" },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("defineMcpToolkit");
    expect(server).toContain("docs");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("defineMcpToolkit");
    expect(client).toContain("docs");
  });

  it("still allows a flat toolkit tool named tools", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { db } from "@/db";
export default defineToolkit({
  tools: {
    execute: async () => db.get(),
    render: () => null,
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("db.get");
    expect(server).toContain('type: "backend"');

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("render");
    expect(client).not.toContain("db.get");
  });

  it("routes renderText like a lightweight tool renderer", () => {
    const src = `"use generative";
import { z } from "zod";
import { db } from "@/db";
import { formatResult } from "@/ui/format";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  search: {
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => db.search(query),
    renderText: {
      running: ({ args }) => \`Searching \${args.query}...\`,
      complete: ({ args, result }) => formatResult(args.query, result),
    },
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain("db.search");
    expect(server).toContain('type: "backend"');
    expect(server).not.toContain("renderText");
    expect(server).not.toContain("@/ui/format");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client.trimStart().startsWith('"use client"')).toBe(true);
    expect(client).toContain("renderText");
    expect(client).toContain("formatResult");
    expect(client).toContain("@/ui/format");
    expect(client).not.toContain("db.search");
  });

  it("allows frontend tools to use renderText instead of render", () => {
    const src = `"use generative";
import { z } from "zod";
import { track } from "@/analytics";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  toast: {
    parameters: z.object({ msg: z.string() }),
    execute: async ({ msg }) => {
      "use client";
      return track(msg);
    },
    renderText: {
      running: "Showing toast...",
      complete: "Toast shown",
    },
  },
});`;

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain("track(msg)");
    expect(client).toContain("renderText");
    expect(client).toContain('type: "frontend"');

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).not.toContain("track");
    expect(server).not.toContain("renderText");
    expect(server).toContain('type: "frontend"');
  });

  it("infers `frontend` from execute: stubTool() and strips the executor", () => {
    const src = `"use generative";
import { z } from "zod";
import { defineToolkit, stubTool } from "@assistant-ui/react";
export default defineToolkit({
  add_task: {
    description: "Add a task.",
    parameters: z.object({ title: z.string() }),
    execute: stubTool(),
    renderText: {
      running: "Adding task",
      complete: "Task added",
    },
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "frontend"');
    expect(server).not.toContain("disabled");
    expect(server).not.toContain("stubTool");
    expect(server).not.toContain("execute");
    expect(server).not.toContain("renderText");

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "frontend"');
    expect(client).not.toContain("disabled");
    expect(client).toContain("renderText");
    expect(client).toContain("unstable_backendDefault");
    expect(client).not.toContain("stubTool");
    expect(client).not.toContain("execute");
  });

  it("infers `backend` from execute: externalTool(), renders on the client, and omits from the server", () => {
    const src = `"use generative";
import { z } from "zod";
import { SearchResults } from "@/ui/search-results";
import { defineToolkit, externalTool } from "@assistant-ui/react";
export default defineToolkit({
  web_search: {
    description: "Search the web.",
    parameters: z.object({ query: z.string() }),
    execute: externalTool(),
    render: ({ args, result }) => <SearchResults query={args.query} results={result} />,
  },
});`;

    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).not.toContain("web_search");
    expect(server).not.toContain('type: "backend"');
    expect(server).not.toContain("server-only");
    expect(server).not.toContain("description");
    expect(server).not.toContain("parameters");
    expect(server).not.toContain("execute");
    expect(server).not.toContain("externalTool");
    expect(server).not.toContain("SearchResults");
    expect(server).not.toContain('from "zod"');

    const client = compileGenerative(src, { target: "client" }).code;
    expect(client.trimStart().startsWith('"use client"')).toBe(true);
    expect(client).toContain('type: "backend"');
    expect(client).toContain("render");
    expect(client).toContain("SearchResults");
    expect(client).not.toContain("description");
    expect(client).not.toContain("parameters");
    expect(client).not.toContain("execute");
    expect(client).not.toContain("externalTool");
    expect(client).not.toContain('from "zod"');
  });

  it("requires a renderer for external tools", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit, externalTool } from "@assistant-ui/react";\nexport default defineToolkit({ search: { execute: externalTool() } });`,
        { target: "client" },
      ),
    ).toThrow(/external tool must declare a `render` or `renderText`/);
  });
});

describe("compileGenerative — local dead-code elimination", () => {
  const withHelpers = `"use generative";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { db } from "@/db";

const Badge = ({ label }) => <span className={cn("badge")}>{label}</span>;
import { defineToolkit } from "@assistant-ui/react";

export default defineToolkit({
  weather: {
    description: "weather",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.weather.get(city),
    render: (props) => <Badge label={props.city} />,
  },
});
`;

  it("strips a local helper component (and its imports) from the server", () => {
    const code = compileGenerative(withHelpers, { target: "server" }).code;
    expect(code).not.toContain("Badge");
    expect(code).not.toContain("@/lib/utils");
    expect(code).not.toContain("className");
    expect(code).toContain("db.weather.get");
    expect(code).toContain('import "server-only"');
  });

  it("keeps the local helper on the client", () => {
    const code = compileGenerative(withHelpers, { target: "client" }).code;
    expect(code).toContain("Badge");
    expect(code).toContain("@/lib/utils");
    expect(code).not.toContain("@/db");
  });

  it("prunes an unused destructured server binding from the client", () => {
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { db } from "@/db";
const { getWeather } = db;
export default defineToolkit({
  weather: {
    execute: async ({ city }) => getWeather(city),
    render: () => null,
  },
});`;
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).not.toContain("getWeather");
    expect(client).not.toContain("@/db");
    expect(compileGenerative(src, { target: "server" }).code).toContain(
      "getWeather",
    );
  });
});

describe("compileGenerative — diagnostics", () => {
  it("rejects a module without the directive", () => {
    expect(() =>
      compileGenerative(`export default {} satisfies Toolkit;`, {
        target: "server",
      }),
    ).toThrow(GenerativeCompileError);
  });

  it("strips a define-style wrapper and prunes its import", () => {
    const wrapped = `"use generative";
import { z } from "zod";
import { db } from "@/db";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  weather: {
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.get(city),
    render: (props) => <span>{props.city}</span>,
  },
});`;
    const serverCode = compileGenerative(wrapped, { target: "server" }).code;
    // wrapper + its import gone; bare object with execute remains.
    expect(serverCode).not.toContain("defineToolkit");
    expect(serverCode).not.toContain("@assistant-ui/react");
    expect(serverCode).toContain("db.get");
    expect(serverCode).not.toContain("<span");

    const clientCode = compileGenerative(wrapped, { target: "client" }).code;
    expect(clientCode).not.toContain("defineToolkit");
    expect(clientCode).not.toContain("@assistant-ui/react");
    expect(clientCode).toContain("<span");
    expect(clientCode).not.toContain("@/db");
  });

  it("requires the defineToolkit() wrapper", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nexport default { a: { execute: async () => 1 } };`,
        { target: "server" },
      ),
    ).toThrow(/defineToolkit/);
    expect(() =>
      compileGenerative(`"use generative";\nexport default makeToolkit();`, {
        target: "server",
      }),
    ).toThrow(/defineToolkit/);
  });

  it("rejects a raw default export even when a defineToolkit exists elsewhere", () => {
    // The default export is what the runtime registers, so it must itself be
    // wrapped — an unrelated defineToolkit() must not let a bare object through.
    const src = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
const unused = defineToolkit({ x: { execute: async () => 1, render: () => null } });
export default { weather: { execute: async () => 1, render: () => null } };`;
    expect(() => compileGenerative(src, { target: "client" })).toThrow(
      /default export must be defineToolkit/,
    );
  });

  it("rejects a tool that isn't an inline object literal", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/react";\nexport default defineToolkit({ weather: makeTool() });`,
        { target: "server" },
      ),
    ).toThrow(/inline object literal/);
  });

  it("requires a render for human tools", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit, humanTool } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { execute: humanTool() } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare a `render`/);
  });

  it("requires a render or renderText for frontend tools", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/react";\nexport default defineToolkit({ toast: { execute: async () => { "use client"; return 1; } } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare a `render` or `renderText`/);
  });

  it("requires every tool to declare an execute", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { render: () => null } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare an `execute`/);
  });

  it("infers `human` from execute: humanTool() and drops it on both builds", () => {
    const src = `"use generative";\nimport { defineToolkit, humanTool } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { execute: humanTool(), render: () => null } });`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "human"');
    expect(server).not.toContain("humanTool"); // sentinel + its import pruned
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "human"');
    expect(client).not.toContain("humanTool");
    expect(client).toContain("render");
  });

  it("keeps deprecated human-tool sentinels working", () => {
    for (const sentinel of ["hitl", "hitlTool"]) {
      const src = `"use generative";\nimport { defineToolkit, ${sentinel} } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { execute: ${sentinel}(), render: () => null } });`;
      for (const target of ["client", "server"] as const) {
        const code = compileGenerative(src, { target }).code;
        expect(code).toContain('type: "human"');
        expect(code).not.toContain(sentinel);
      }
    }
  });

  it("rejects spread properties in providerTool config", () => {
    const src = `"use generative";
import { defineToolkit, providerTool } from "@assistant-ui/react";
const config = { providerId: "openai.web_search_preview", args: {} };
export default defineToolkit({
  web_search: {
    execute: providerTool({
      ...config,
    }),
  },
});`;

    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /can only contain object properties/,
    );
  });

  it("rejects object methods in providerTool config", () => {
    const src = `"use generative";
import { defineToolkit, providerTool } from "@assistant-ui/react";
export default defineToolkit({
  web_search: {
    execute: providerTool({
      providerId: "openai.web_search_preview",
      args: {},
      get providerOptions() {
        return {};
      },
    }),
  },
});`;

    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /can only contain object properties/,
    );
  });

  it("rejects function-valued properties in providerTool config", () => {
    const src = `"use generative";
import { defineToolkit, providerTool } from "@assistant-ui/react";
export default defineToolkit({
  web_search: {
    execute: providerTool({
      providerId: "openai.web_search_preview",
      args: {},
      providerOptions: () => ({}),
    }),
  },
});`;

    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /cannot contain function-valued properties/,
    );
  });

  it("rejects providerTool config properties that duplicate tool properties", () => {
    const src = `"use generative";
import { defineToolkit, providerTool } from "@assistant-ui/react";
export default defineToolkit({
  web_search: {
    render: () => null,
    execute: providerTool({
      providerId: "openai.web_search_preview",
      args: {},
      render: "duplicate",
    }),
  },
});`;

    expect(() => compileGenerative(src, { target: "server" })).toThrow(
      /cannot duplicate tool properties/,
    );
  });

  it("infers `frontend` from a `use client` execute and keeps it client-side", () => {
    const src = `"use generative";\nimport { defineToolkit } from "@assistant-ui/react";\nimport { track } from "@/a";\nexport default defineToolkit({ t: { execute: async () => { "use client"; return track(); }, render: () => null } });`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "frontend"');
    expect(server).not.toContain("track"); // frontend execute dropped on server
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "frontend"');
    expect(client).toContain("track()");
  });

  it("detects generative modules by directive", () => {
    expect(isGenerativeModule(`"use generative";\nexport default {};`)).toBe(
      true,
    );
    expect(isGenerativeModule(`// a comment\n"use generative";\n`)).toBe(true);
    expect(isGenerativeModule(`export default {};`)).toBe(false);
  });
});
