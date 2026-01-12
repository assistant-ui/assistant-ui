import fs from "node:fs/promises";
import path from "node:path";

export interface GenerateHtmlOptions {
  title: string;
  jsPath?: string;
  cssPath?: string;
  inlineJs?: string;
  inlineCss?: string;
  inline?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function generateHtml(options: GenerateHtmlOptions): string {
  const {
    title,
    jsPath,
    cssPath,
    inlineJs,
    inlineCss,
    inline = false,
  } = options;

  const cssContent =
    inline && inlineCss
      ? `<style>${inlineCss}</style>`
      : cssPath
        ? `<link rel="stylesheet" href="${cssPath}">`
        : "";

  const jsContent =
    inline && inlineJs
      ? `<script type="module">${inlineJs}</script>`
      : jsPath
        ? `<script type="module" src="${jsPath}"></script>`
        : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${cssContent}
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  ${jsContent}
</body>
</html>`;
}

export interface WriteHtmlOptions extends GenerateHtmlOptions {
  outputPath: string;
  jsBundlePath?: string;
  cssBundlePath?: string;
}

export async function writeHtml(options: WriteHtmlOptions): Promise<void> {
  const {
    outputPath,
    jsBundlePath,
    cssBundlePath,
    inline = false,
    ...htmlOptions
  } = options;

  let inlineJs: string | undefined;
  let inlineCss: string | undefined;

  if (inline) {
    if (jsBundlePath) {
      try {
        inlineJs = await fs.readFile(jsBundlePath, "utf-8");
      } catch {
        // Fall back to external file
      }
    }
    if (cssBundlePath) {
      try {
        inlineCss = await fs.readFile(cssBundlePath, "utf-8");
      } catch {
        // Fall back to external file or none
      }
    }
  }

  const html = generateHtml({
    ...htmlOptions,
    inline,
    inlineJs,
    inlineCss,
    jsPath: inline && inlineJs ? undefined : htmlOptions.jsPath,
    cssPath: inline && inlineCss ? undefined : htmlOptions.cssPath,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf-8");
}
