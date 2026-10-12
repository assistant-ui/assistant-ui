import { renderGenerativeUI } from "@assistant-ui/generative-ui/react";
import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import {
  generativeUiCssText,
  generativeUiThemeVars,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css.ts";
import { styledGenerativeUILibrary } from "@assistant-ui/ui/components/assistant-ui/elements/generative-ui.tsx";
import { createWidget, defaultThemeTokens } from "generative-frame";
import type { Spec } from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { Component, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Format } from "./types.ts";

// The shadcn light theme the kit's registry and examples ship, which the vocabulary's styles read.
const THEME = `:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
${Object.entries(generativeUiThemeVars.light)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n")}
}`;

// The kit's markdown-text styles (packages/ui/src/components/react/assistant-ui/elements/markdown-text.tsx) written out as plain CSS, since this page has no Tailwind.
const MARKDOWN = `.markdown { line-height: 1.625; }
.markdown > :first-child { margin-top: 0; }
.markdown > :last-child { margin-bottom: 0; }
.markdown h1, .markdown h2, .markdown h3, .markdown h4, .markdown h5, .markdown h6 { margin: 1.25rem 0 0.5rem; line-height: 1.4; }
.markdown h1 { font-size: 1.25rem; font-weight: 600; }
.markdown h2 { font-size: 1.125rem; font-weight: 600; }
.markdown h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.375rem; }
.markdown h4 { font-size: 1rem; font-weight: 500; margin: 0.875rem 0 0.25rem; }
.markdown h5, .markdown h6 { font-size: 0.875rem; margin: 0.75rem 0 0.25rem; }
.markdown h5 { font-weight: 600; }
.markdown h6 { font-weight: 500; }
.markdown p { margin: 0.75rem 0; }
.markdown a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
.markdown blockquote { margin: 0.75rem 0; padding-inline-start: 1rem; border-inline-start: 2px solid color-mix(in oklab, var(--muted-foreground) 30%, transparent); color: var(--muted-foreground); }
.markdown ul, .markdown ol { margin: 0.75rem 0; padding: 0; margin-inline-start: 1.25rem; }
.markdown ul { list-style: disc; }
.markdown ol { list-style: decimal; }
.markdown li { margin-top: 0.25rem; }
.markdown li::marker { color: var(--muted-foreground); }
.markdown hr { margin: 0.75rem 0; border: 0; border-top: 1px solid color-mix(in oklab, var(--muted-foreground) 20%, transparent); }
.markdown table { width: 100%; margin: 0.75rem 0; border-collapse: separate; border-spacing: 0; }
.markdown th { background: var(--muted); padding: 0.375rem 0.75rem; text-align: start; font-weight: 500; }
.markdown th:first-child { border-start-start-radius: 0.5rem; }
.markdown th:last-child { border-start-end-radius: 0.5rem; }
.markdown td { padding: 0.375rem 0.75rem; text-align: start; border-inline-start: 1px solid color-mix(in oklab, var(--muted-foreground) 20%, transparent); border-bottom: 1px solid color-mix(in oklab, var(--muted-foreground) 20%, transparent); }
.markdown td:last-child { border-inline-end: 1px solid color-mix(in oklab, var(--muted-foreground) 20%, transparent); }
.markdown strong { font-weight: 600; }
.markdown code { background: var(--muted); border-radius: 0.375rem; padding: 0.125rem 0.375rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
.markdown pre { margin: 0.75rem 0; padding: 0.875rem; overflow-x: auto; border: 1px solid color-mix(in oklab, var(--border) 50%, transparent); border-radius: 0.75rem; background: color-mix(in oklab, var(--muted) 30%, transparent); font-size: 13px; line-height: 1.625; }
.markdown pre code { background: none; padding: 0; font-size: inherit; }`;

const PAGE = `html, body { margin: 0; background: var(--background); color: var(--foreground); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
#answer { box-sizing: border-box; width: 100%; padding: 16px; }`;

const style = document.createElement("style");
style.textContent = [THEME, generativeUiCssText(), MARKDOWN, PAGE].join("\n\n");
document.head.appendChild(style);

const { catalog, components } = toSpecCatalog(styledGenerativeUILibrary);
const tokens = defaultThemeTokens("light");
const container = document.getElementById("answer")!;

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/** Waits until nothing in the answer is busy and it has stopped changing for 300 ms, for content drawn after it mounts such as a map or a diagram, for at most five seconds. */
const domSettled = () =>
  new Promise<void>((resolve) => {
    const finish = () => {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(limit);
      resolve();
    };
    const settle = () => {
      if (container.querySelector('[aria-busy="true"]')) {
        quiet = setTimeout(settle, 300);
      } else {
        finish();
      }
    };
    let quiet = setTimeout(settle, 300);
    const limit = setTimeout(finish, 5_000);
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(settle, 300);
    });
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });

/** Waits until every image has loaded or failed, for at most five seconds. */
const imagesSettled = () =>
  Promise.race([
    Promise.all(
      [...container.querySelectorAll("img")].map((image) =>
        image.complete
          ? undefined
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

let root: Root | undefined;
let disposeWidget: (() => void) | undefined;

function reset() {
  root?.unmount();
  root = undefined;
  disposeWidget?.();
  disposeWidget = undefined;
  container.replaceChildren();
}

async function renderFrame(code: string, errors: string[]) {
  const host = document.createElement("div");
  container.appendChild(host);
  const widget = createWidget({
    container: host,
    tokens,
    animate: false,
    onOpenLink: () => {},
    onPrompt: () => {},
  });
  disposeWidget = () => widget.dispose();
  let connected = false;
  void widget.ready.then(
    () => {
      connected = true;
    },
    () => {},
  );
  widget.write(code);
  try {
    await widget.end();
  } catch (error) {
    // A frame that connected but never finished failed on the widget's own code, such as a script that never yields; one that never connected failed on the browser or the frame host.
    if (!connected) throw error;
    errors.push(`The widget never finished rendering (${describe(error)}).`);
    return;
  }
  // Matches previewWidget's default settle time for scripts, fonts, and animations.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const inspection = await widget.inspect();
  errors.push(
    ...inspection.errors.map((error) => `${error.kind}: ${error.message}`),
  );
  if (inspection.blank) errors.push("The widget rendered blank.");
}

function parse(artifact: string, errors: string[]): unknown {
  try {
    return JSON.parse(artifact);
  } catch {
    errors.push("The answer is not JSON, so nothing renders.");
    return undefined;
  }
}

function declarative(format: Format, artifact: string, errors: string[]) {
  if (format === "text") {
    return (
      <div className="markdown">
        <Markdown remarkPlugins={[remarkGfm]}>{artifact}</Markdown>
      </div>
    );
  }
  const value = parse(artifact, errors);
  if (value === undefined) return null;
  if (format === "present") {
    return (
      <div data-aui="root">
        {renderGenerativeUI(value, styledGenerativeUILibrary)}
      </div>
    );
  }
  return (
    <div data-gf-spec="">
      <SpecRenderer
        spec={value as Spec}
        catalog={catalog}
        components={components}
        onError={(error) => errors.push(error.message)}
      />
    </div>
  );
}

/** Renders one answer the way a chat app shows it and reports what went wrong, so the page can be captured. */
async function renderAnswer(format: Format, artifact: string) {
  reset();
  const errors: string[] = [];
  if (format === "frame") {
    await renderFrame(artifact, errors);
  } else {
    root = createRoot(container, {
      onCaughtError: (error) => errors.push(describe(error)),
      onUncaughtError: (error) => errors.push(describe(error)),
    });
    const content = declarative(format, artifact, errors);
    flushSync(() => root!.render(<Boundary>{content}</Boundary>));
    if (
      !container.textContent?.trim() &&
      !container.querySelector(
        "img, svg, canvas, video, iframe, input, select, textarea, button, hr",
      )
    ) {
      errors.push("The answer rendered blank.");
    }
    await domSettled();
    await imagesSettled();
  }
  await document.fonts.ready;
  await nextFrame();
  await nextFrame();
  return {
    height: Math.ceil(container.getBoundingClientRect().height),
    errors,
  };
}

Object.assign(window, { renderAnswer });
