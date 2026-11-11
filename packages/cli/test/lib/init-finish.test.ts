import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ASSISTANT_PAGE_SOURCE,
  CN_UTILS_SOURCE,
  describeInitFinish,
  finishExistingProjectInit,
  isCreateNextAppStarterPage,
  readFontSnapshot,
  readLayoutFontVariables,
  repairSelfReferencingFonts,
  snapshotProjectFonts,
} from "../../src/lib/init-finish";

const STARTER_CSS = `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
`;

const SHADCN_CSS = `@import "tailwindcss";
@import "shadcn/tailwind.css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
}
`;

const STARTER_LAYOUT = `import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
`;

const STARTER_PAGE = `import Image from "next/image";

export default function Home() {
  return (
    <div>
      <Image src="/next.svg" alt="Next.js logo" width={100} height={20} />
      <a href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw">
        Templates
      </a>
    </div>
  );
}
`;

describe("font repair", () => {
  it("reads the font values a stylesheet sets", () => {
    expect(readFontSnapshot(STARTER_CSS)).toEqual({
      "--font-sans": "var(--font-geist-sans)",
      "--font-mono": "var(--font-geist-mono)",
    });
  });

  it("ignores self-referencing values in the snapshot", () => {
    expect(readFontSnapshot(SHADCN_CSS)).toEqual({
      "--font-mono": "var(--font-geist-mono)",
    });
  });

  it("reads next/font variables from the layout", () => {
    expect(readLayoutFontVariables(STARTER_LAYOUT)).toEqual([
      "--font-geist-sans",
      "--font-geist-mono",
    ]);
  });

  it("restores the value the stylesheet had before shadcn init", () => {
    const { css, repairs } = repairSelfReferencingFonts(
      SHADCN_CSS,
      { "--font-sans": "var(--font-geist-sans)" },
      [],
    );
    expect(css).toContain("  --font-sans: var(--font-geist-sans);\n");
    expect(css).not.toContain("--font-sans: var(--font-sans)");
    expect(css).toContain("--font-heading: var(--font-sans);");
    expect(repairs).toEqual([
      { key: "--font-sans", value: "var(--font-geist-sans)" },
    ]);
  });

  it("falls back to the layout's next/font variable", () => {
    const { css } = repairSelfReferencingFonts(
      SHADCN_CSS,
      {},
      readLayoutFontVariables(STARTER_LAYOUT),
    );
    expect(css).toContain("--font-sans: var(--font-geist-sans);");
  });

  it("leaves it alone when the layout loads a font into --font-sans", () => {
    const { css, repairs } = repairSelfReferencingFonts(
      SHADCN_CSS,
      { "--font-sans": "var(--font-geist-sans)" },
      ["--font-sans"],
    );
    expect(css).toBe(SHADCN_CSS);
    expect(repairs).toEqual([]);
  });

  it("drops the cycle when there is nothing to point at", () => {
    const { css, repairs } = repairSelfReferencingFonts(SHADCN_CSS, {}, []);
    expect(css).not.toMatch(/^\s*--font-sans:/m);
    expect(css).toContain(
      "  --color-foreground: var(--foreground);\n  --font-mono:",
    );
    expect(repairs).toEqual([{ key: "--font-sans", value: null }]);
  });
});

describe("starter page detection", () => {
  it("detects the create-next-app page", () => {
    expect(isCreateNextAppStarterPage(STARTER_PAGE)).toBe(true);
  });

  it("does not treat an edited page as the starter", () => {
    expect(
      isCreateNextAppStarterPage(
        "export default function Home() { return <main>Hi</main>; }",
      ),
    ).toBe(false);
  });
});

describe("finishExistingProjectInit", () => {
  let root: string;

  const write = (rel: string, data: string) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  };
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "aui-fin-")));
    write("app/globals.css", STARTER_CSS);
    write("app/layout.tsx", STARTER_LAYOUT);
    write("app/page.tsx", STARTER_PAGE);
    write(
      "package.json",
      JSON.stringify({ dependencies: { next: "16.0.0" } }, null, 2),
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const simulateShadcn = () => {
    write("app/globals.css", SHADCN_CSS);
    write(
      "components.json",
      JSON.stringify({ tailwind: { css: "app/globals.css" } }),
    );
    write("app/assistant.tsx", "export const Assistant = () => null;\n");
    write("lib/utils.ts", 'export { cn } from "cn"\n');
    write(
      "package.json",
      JSON.stringify({ dependencies: { next: "16.0.0", cn: "^0.5.2" } }),
    );
  };

  it("fixes a fresh create-next-app project", () => {
    const snapshots = snapshotProjectFonts(root);
    simulateShadcn();

    const result = finishExistingProjectInit(root, snapshots);

    expect(read("app/globals.css")).toContain(
      "--font-sans: var(--font-geist-sans);",
    );
    expect(read("app/page.tsx")).toBe(ASSISTANT_PAGE_SOURCE);
    expect(read("lib/utils.ts")).toBe(CN_UTILS_SOURCE);
    expect(result.page).toEqual({
      status: "replaced",
      pagePath: "app/page.tsx",
    });

    const lines = describeInitFinish(result);
    expect(lines[0]).toBe(
      "app/page.tsx now renders <Assistant />. Run the dev server and open /.",
    );
    expect(lines.some((line) => line.startsWith("TooltipProvider"))).toBe(true);
    expect(lines.some((line) => line.includes("`cn`"))).toBe(true);
  });

  it("keeps an edited page and says where to render the assistant", () => {
    const custom = "export default function Home() { return <main />; }\n";
    write("app/page.tsx", custom);
    const snapshots = snapshotProjectFonts(root);
    simulateShadcn();

    const result = finishExistingProjectInit(root, snapshots);

    expect(read("app/page.tsx")).toBe(custom);
    expect(describeInitFinish(result)[0]).toBe(
      'Next step: render <Assistant /> (import { Assistant } from "./assistant") in app/page.tsx or any page.',
    );
  });

  it("leaves a customized lib/utils.ts alone", () => {
    const snapshots = snapshotProjectFonts(root);
    simulateShadcn();
    const custom =
      'import { clsx } from "clsx";\nexport const cn = (...a: string[]) => clsx(a);\n';
    write("lib/utils.ts", custom);

    const result = finishExistingProjectInit(root, snapshots);

    expect(read("lib/utils.ts")).toBe(custom);
    expect(result.cnExplained).toBe(false);
  });

  it("does nothing to pages when no assistant file was installed", () => {
    const snapshots = snapshotProjectFonts(root);
    write(
      "components.json",
      JSON.stringify({ tailwind: { css: "app/globals.css" } }),
    );

    const result = finishExistingProjectInit(root, snapshots);

    expect(read("app/page.tsx")).toBe(STARTER_PAGE);
    expect(result.page).toEqual({ status: "no-assistant" });
    expect(result.fontRepairs).toEqual([]);
    expect(
      describeInitFinish(result).some((line) => line.includes("`cn`")),
    ).toBe(false);
  });

  it("supports the src/ directory layout", () => {
    fs.rmSync(path.join(root, "app"), { recursive: true });
    write("src/app/globals.css", STARTER_CSS);
    write("src/app/layout.tsx", STARTER_LAYOUT);
    write("src/app/page.tsx", STARTER_PAGE);
    const snapshots = snapshotProjectFonts(root);
    write("src/app/globals.css", SHADCN_CSS);
    write(
      "components.json",
      JSON.stringify({ tailwind: { css: "src/app/globals.css" } }),
    );
    write("src/app/assistant.tsx", "export const Assistant = () => null;\n");

    const result = finishExistingProjectInit(root, snapshots);

    expect(read("src/app/page.tsx")).toBe(ASSISTANT_PAGE_SOURCE);
    expect(read("src/app/globals.css")).toContain(
      "--font-sans: var(--font-geist-sans);",
    );
    expect(result.page).toEqual({
      status: "replaced",
      pagePath: "src/app/page.tsx",
    });
  });
});
