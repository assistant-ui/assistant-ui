import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const themePath = resolve(here, "theme.css");
const templatePath = resolve(
  here,
  "../../../templates/default/app/globals.css",
);
const require = createRequire(import.meta.url);

const read = (path: string) => readFile(path, "utf8");

const themeInlineBlocks = (css: string) => {
  const blocks: string[] = [];
  const pattern = /@theme inline\s*\{/g;
  for (let match = pattern.exec(css); match; match = pattern.exec(css)) {
    let depth = 1;
    let index = match.index + match[0].length;
    while (depth > 0 && index < css.length) {
      if (css[index] === "{") depth++;
      if (css[index] === "}") depth--;
      index++;
    }
    blocks.push(css.slice(match.index + match[0].length, index - 1));
  }
  return blocks.join("\n");
};

const declaredNames = (css: string) =>
  new Set(Array.from(css.matchAll(/(--[\w-]+)\s*:/g), (m) => m[1] ?? ""));

const referencedNames = (css: string) =>
  new Set(Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (m) => m[1] ?? ""));

const loadStylesheet = async (id: string, base: string) => {
  const path =
    id === "tailwindcss"
      ? require.resolve("tailwindcss/index.css")
      : id === "@assistant-ui/vscode/theme.css"
        ? themePath
        : resolve(base, id);
  return { path, base: dirname(path), content: await read(path) };
};

const build = async (css: string, candidates: string[]) => {
  const compiler = await compile(css, { base: here, loadStylesheet });
  return compiler.build(candidates);
};

describe("theme.css", () => {
  it("defines every token the default template's @theme inline block reads", async () => {
    const [theme, template] = await Promise.all([
      read(themePath),
      read(templatePath),
    ]);
    const templateTokens = Array.from(
      themeInlineBlocks(template).matchAll(
        /(--(?:color|radius|font)-[\w-]+)\s*:\s*([^;]+);/g,
      ),
      (m) => ({ key: m[1] ?? "", value: m[2] ?? "" }),
    );
    const defined = declaredNames(theme);
    const themeKeys = declaredNames(themeInlineBlocks(theme));

    const tokens = new Set(
      templateTokens
        .filter(({ key }) => !key.startsWith("--font-"))
        .flatMap(({ value }) => Array.from(referencedNames(value))),
    );
    expect(tokens.size).toBeGreaterThan(30);
    expect(Array.from(tokens).filter((name) => !defined.has(name))).toEqual([]);
    expect(
      templateTokens.map(({ key }) => key).filter((key) => !themeKeys.has(key)),
    ).toEqual([]);
  });

  it("maps tokens to VS Code theme variables", async () => {
    const theme = await read(themePath);
    for (const [token, variable] of [
      ["--aui-vscode-background", "--vscode-sideBar-background"],
      ["--primary", "--vscode-button-background"],
      ["--muted-foreground", "--vscode-descriptionForeground"],
      ["--accent", "--vscode-list-hoverBackground"],
      ["--destructive", "--vscode-errorForeground"],
      ["--border", "--vscode-panel-border"],
      ["--input", "--vscode-input-border"],
      ["--ring", "--vscode-focusBorder"],
    ] as const) {
      expect(theme).toMatch(
        new RegExp(`${token}:\\s*var\\(\\s*${variable}\\b`),
      );
    }
  });

  it("derives muted and secondary from the surface", async () => {
    const theme = await read(themePath);
    for (const [token, percent] of [
      ["--muted", 6],
      ["--secondary", 12],
    ] as const) {
      expect(theme).toMatch(
        new RegExp(
          `${token}:\\s*color-mix\\(\\s*in srgb,\\s*var\\(--foreground\\) ${percent}%,\\s*var\\(--background\\)\\s*\\);`,
        ),
      );
    }
    expect(theme).toMatch(/--secondary-foreground:\s*var\(--foreground\);/);
  });

  it("keeps --muted off every VS Code variable a surface background reads", async () => {
    const theme = await read(themePath);
    const declarations = (name: string) =>
      Array.from(
        theme.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g")),
        (m) => m[1] ?? "",
      );
    const backgroundVariables = new Set(
      declarations("--aui-vscode-background").flatMap((value) =>
        Array.from(referencedNames(value)),
      ),
    );
    expect(backgroundVariables).toEqual(
      new Set([
        "--vscode-sideBar-background",
        "--vscode-editor-background",
        "--vscode-panel-background",
      ]),
    );

    const muted = declarations("--muted");
    expect(muted.length).toBeGreaterThan(0);
    for (const value of muted) {
      const referenced = Array.from(referencedNames(value));
      expect(referenced).toContain("--foreground");
      expect(
        referenced.filter((name) => backgroundVariables.has(name)),
      ).toEqual([]);
      expect(referenced.filter((name) => name.startsWith("--vscode-"))).toEqual(
        [],
      );
    }
  });

  it("gives primary a fill and text colour under high contrast", async () => {
    const theme = await read(themePath);
    const start = theme.indexOf(
      "body:is(.vscode-high-contrast, .vscode-high-contrast-light) {",
    );
    expect(start).toBeGreaterThan(-1);
    const block = theme.slice(start, theme.indexOf("}", start));
    expect(block).toMatch(
      /--primary:\s*var\(--vscode-textLink-foreground, LinkText\);/,
    );
    expect(block).toMatch(/--primary-foreground:\s*var\(--background\);/);
    expect(block).toMatch(/--ring:\s*var\(\s*--vscode-contrastActiveBorder\b/);
  });

  it("keeps secondary text lighter than the foreground in light themes", async () => {
    const theme = await read(themePath);
    const start = theme.indexOf(
      "body.vscode-light:not(.vscode-high-contrast) {",
    );
    expect(start).toBeGreaterThan(-1);
    const block = theme.slice(start, theme.indexOf("}", start));
    expect(block).toMatch(
      /--muted-foreground:\s*color-mix\(\s*in srgb,\s*var\(--foreground\) \d+%,\s*var\(--background\)\s*\);/,
    );
  });

  it("outlines the kit's muted surfaces under high contrast", async () => {
    const css = await build(
      '@import "tailwindcss";\n@import "@assistant-ui/vscode/theme.css";',
      [],
    );
    const hc = ":is(.vscode-high-contrast, .vscode-high-contrast-light)";
    for (const hook of [
      ".aui-user-message-content",
      '[data-slot="composer-quote"]',
      '[data-slot="chat-panel-user-message"]',
      '[data-slot="chat-panel-composer"]',
      '[data-slot="aui_thread-list-item"]',
      '[data-slot="thread-list"]',
    ]) {
      const start = css.lastIndexOf(hc, css.indexOf(hook));
      expect(start, hook).toBeGreaterThan(-1);
      const rule = css.slice(start, css.indexOf("}", start));
      expect(rule, hook).toContain(hook);
      expect(rule, hook).toMatch(/outline: 1px (solid|dashed)/);
    }
  });

  it("re-points the dark variant to VS Code's dark theme classes", async () => {
    const css = await build(
      '@import "tailwindcss";\n@import "@assistant-ui/vscode/theme.css";',
      ["dark:bg-background", "bg-primary/90", "font-mono", "rounded-lg"],
    );

    expect(css).toContain(
      ".dark\\:bg-background:is(.vscode-dark *, .vscode-high-contrast:not(.vscode-high-contrast-light) *)",
    );
    expect(css).toMatch(/\.bg-primary\\\/90 \{[^}]*var\(--primary\)/);
    expect(css).toMatch(
      /\.font-mono \{\s*font-family: var\(\s*--vscode-editor-font-family/,
    );
    expect(css).toMatch(/\.rounded-lg \{\s*border-radius: var\(--radius\);/);
  });

  it("overrides the template's dark variant and fonts when imported after them", async () => {
    const template = (await read(templatePath))
      .replace(/^@import "tw-animate-css";$/m, "")
      .replace(/^@source .*$/m, "");

    const after = await build(
      `${template}\n@import "@assistant-ui/vscode/theme.css";`,
      ["dark:bg-background", "font-sans"],
    );
    expect(after).toContain(":is(.vscode-dark *,");
    expect(after).toMatch(
      /\.font-sans \{\s*font-family: var\(--vscode-font-family/,
    );

    const before = await build(
      template.replace(
        '@import "tailwindcss";',
        '@import "tailwindcss";\n@import "@assistant-ui/vscode/theme.css";',
      ),
      ["dark:bg-background"],
    );
    expect(before).toContain(".dark\\:bg-background:is(.dark *)");
  });

  it("reverts the webview defaults VS Code injects as @layer vscode-default", async () => {
    const css = await build(
      '@layer vscode-default { blockquote { background: red; } }\n@import "tailwindcss";\n@import "@assistant-ui/vscode/theme.css";',
      [],
    );
    const baseStart = css.indexOf("@layer base {");
    expect(baseStart).toBeGreaterThan(css.indexOf("@layer vscode-default"));
    const base = css.slice(baseStart);
    const ruleOf = (selector: string) => {
      const start = base.indexOf(`${selector} {`);
      expect(start, selector).toBeGreaterThan(-1);
      return base.slice(start, base.indexOf("}", start));
    };

    // Declarations of VS Code's default webview sheet that preflight leaves unset.
    for (const [selector, properties] of [
      [":where(img, video)", ["max-height"]],
      [":where(a code)", ["color"]],
      [
        ":where(a, input, select, textarea):focus",
        ["outline", "outline-offset"],
      ],
      [":where(code, kbd)", ["color", "background-color", "border-radius"]],
      [":where(kbd)", ["box-shadow", "vertical-align"]],
      [":where(blockquote)", ["background"]],
    ] as const) {
      const rule = ruleOf(selector);
      for (const property of properties) {
        expect(rule, `${selector} ${property}`).toMatch(
          new RegExp(`\\b${property}: revert;`),
        );
      }
    }
  });
});
