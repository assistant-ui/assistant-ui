import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ASSISTANT_PAGE_SOURCE,
  CN_UTILS_SOURCE,
  describeInitFinish,
  finishExistingProjectInit,
  repairSelfReferencingFonts,
  snapshotProjectFonts,
} from "../../src/lib/init-finish";

const theme = (sans: string) => `@theme inline {
  --color-foreground: var(--foreground);
  --font-sans: ${sans};
  --font-mono: var(--font-geist-mono);
}
`;
const STARTER_CSS = theme("var(--font-geist-sans)");
const SHADCN_CSS = theme("var(--font-sans)");
const LAYOUT = `const a = Geist({ variable: "--font-geist-sans" });
const b = Geist_Mono({ variable: "--font-geist-mono" });
`;
const STARTER_PAGE = `<Image src="/next.svg" /><a href="https://vercel.com?utm_source=create-next-app">x</a>`;

describe("repairSelfReferencingFonts", () => {
  it.each([
    ["the pre-init value", { "--font-sans": "var(--x)" }, [], "var(--x)"],
    [
      "the layout's next/font variable",
      {},
      ["--font-geist-sans"],
      "var(--font-geist-sans)",
    ],
    ["nothing, dropping the line", {}, [], null],
  ])("points --font-sans at %s", (_, snapshot, layoutVars, value) => {
    const { css, repairs } = repairSelfReferencingFonts(
      SHADCN_CSS,
      snapshot,
      layoutVars,
    );
    expect(repairs).toEqual([{ key: "--font-sans", value }]);
    expect(css).toBe(
      value
        ? theme(value)
        : SHADCN_CSS.replace("  --font-sans: var(--font-sans);\n", ""),
    );
  });

  it("keeps it when the layout loads a font into --font-sans", () => {
    expect(
      repairSelfReferencingFonts(SHADCN_CSS, {}, ["--font-sans"]).css,
    ).toBe(SHADCN_CSS);
  });
});

describe("finishExistingProjectInit", () => {
  let root: string;
  const write = (rel: string, data: string) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), data);
  };
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

  /** A create-next-app project, then what shadcn init + add leave behind. */
  const runInit = (appDir: string, page = STARTER_PAGE) => {
    write(`${appDir}/globals.css`, STARTER_CSS);
    write(`${appDir}/layout.tsx`, LAYOUT);
    write(`${appDir}/page.tsx`, page);
    const snapshots = snapshotProjectFonts(root);
    write(`${appDir}/globals.css`, SHADCN_CSS);
    write(
      "components.json",
      JSON.stringify({ tailwind: { css: `${appDir}/globals.css` } }),
    );
    write(`${appDir}/assistant.tsx`, "export const Assistant = () => null;\n");
    write("lib/utils.ts", 'export { cn } from "cn"\n');
    write("package.json", JSON.stringify({ dependencies: { cn: "^0.5.2" } }));
    return describeInitFinish(finishExistingProjectInit(root, snapshots));
  };

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "aui-fin-")));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it.each(["app", "src/app"])("fixes a fresh project with %s/", (appDir) => {
    const lines = runInit(appDir);

    expect(read(`${appDir}/globals.css`)).toBe(STARTER_CSS);
    expect(read(`${appDir}/page.tsx`)).toBe(ASSISTANT_PAGE_SOURCE);
    expect(read("lib/utils.ts")).toBe(CN_UTILS_SOURCE);
    expect(lines[0]).toBe(
      `${appDir}/page.tsx now renders <Assistant />. Run the dev server and open /.`,
    );
    expect(lines.join("\n")).toMatch(
      /TooltipProvider: not needed[\s\S]*`cn` dependency/,
    );
  });

  it("keeps an edited page and says where to render the assistant", () => {
    const page = "export default function Home() { return <main />; }\n";
    const lines = runInit("app", page);

    expect(read("app/page.tsx")).toBe(page);
    expect(lines[0]).toBe(
      'Next step: render <Assistant /> (import { Assistant } from "./assistant") in app/page.tsx or any page.',
    );
  });

  it("leaves a customized lib/utils.ts alone", () => {
    write("app/assistant.tsx", "");
    write("lib/utils.ts", "export const cn = () => '';\n");
    finishExistingProjectInit(root, {});
    expect(read("lib/utils.ts")).toBe("export const cn = () => '';\n");
  });
});
