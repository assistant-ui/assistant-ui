import { describe, it, expect } from "vitest";
import {
  compileGenerative,
  isGenerativeModule,
  GenerativeCompileError,
} from "./compile";

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
        `"use generative";\nimport { defineToolkit, hitl } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { execute: hitl() } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare a `render`/);
  });

  it("requires every tool to declare an execute", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { render: () => null } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare an `execute`/);
  });

  it("infers `human` from execute: hitl() and drops it on both builds", () => {
    const src = `"use generative";\nimport { defineToolkit, hitl } from "@assistant-ui/react";\nexport default defineToolkit({ ask: { execute: hitl(), render: () => null } });`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "human"');
    expect(server).not.toContain("hitl"); // sentinel + its import pruned
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "human"');
    expect(client).not.toContain("hitl");
    expect(client).toContain("render");
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
