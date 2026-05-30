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
import { defineToolkit } from "@assistant-ui/next";

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

describe("compileGenerative — local dead-code elimination", () => {
  const withHelpers = `"use generative";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { db } from "@/db";

const Badge = ({ label }) => <span className={cn("badge")}>{label}</span>;
import { defineToolkit } from "@assistant-ui/next";

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
import { defineToolkit } from "@assistant-ui/next";
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
    expect(serverCode).not.toContain("@assistant-ui/next");
    expect(serverCode).toContain("db.get");
    expect(serverCode).not.toContain("<span");

    const clientCode = compileGenerative(wrapped, { target: "client" }).code;
    expect(clientCode).not.toContain("defineToolkit");
    expect(clientCode).not.toContain("@assistant-ui/next");
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

  it("rejects a tool that isn't an inline object literal", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/next";\nexport default defineToolkit({ weather: makeTool() });`,
        { target: "server" },
      ),
    ).toThrow(/inline object literal/);
  });

  it("requires every tool to declare an execute", () => {
    expect(() =>
      compileGenerative(
        `"use generative";\nimport { defineToolkit } from "@assistant-ui/next";\nexport default defineToolkit({ ask: { render: () => null } });`,
        { target: "client" },
      ),
    ).toThrow(/must declare an `execute`/);
  });

  it("infers `human` from execute: hitl() and drops it on both builds", () => {
    const src = `"use generative";\nimport { defineToolkit, hitl } from "@assistant-ui/next";\nexport default defineToolkit({ ask: { execute: hitl(), render: () => null } });`;
    const server = compileGenerative(src, { target: "server" }).code;
    expect(server).toContain('type: "human"');
    expect(server).not.toContain("hitl"); // sentinel + its import pruned
    const client = compileGenerative(src, { target: "client" }).code;
    expect(client).toContain('type: "human"');
    expect(client).not.toContain("hitl");
    expect(client).toContain("render");
  });

  it("infers `frontend` from a `use client` execute and keeps it client-side", () => {
    const src = `"use generative";\nimport { defineToolkit } from "@assistant-ui/next";\nimport { track } from "@/a";\nexport default defineToolkit({ t: { execute: async () => { "use client"; return track(); }, render: () => null } });`;
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
