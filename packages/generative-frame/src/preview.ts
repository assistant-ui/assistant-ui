import type {
  ColorScheme,
  ConsoleEntry,
  WidgetError,
  WidgetKind,
} from "./protocol";
import { defaultThemeTokens } from "./theme";
import { createWidget, type CreateWidgetOptions } from "./widget";

export type PreviewOptions = Pick<
  CreateWidgetOptions,
  "product" | "frame" | "id" | "csp" | "compat" | "css" | "readyTimeoutMs"
> & {
  /** Layout width in CSS pixels. Defaults to 680. */
  width?: number;
  appearance?: ColorScheme;
  tokens?: CreateWidgetOptions["tokens"];
  /** Capture a PNG. Defaults to true. */
  screenshot?: boolean;
  /** Time to let scripts, fonts, and animations settle after `end`. Defaults to 600ms. */
  settleMs?: number;
};

export type PreviewResult = {
  ok: boolean;
  kind: WidgetKind;
  width: number;
  height: number;
  blank: boolean;
  errors: WidgetError[];
  console: ConsoleEntry[];
  screenshot?: string;
  /** Why the screenshot is missing, when capture was requested and failed. */
  screenshotError?: string;
};

/**
 * Renders complete widget code in an offscreen frame and reports what
 * happened: errors, console output, size, blank detection, and a screenshot.
 */
export async function previewWidget(
  code: string,
  options: PreviewOptions = {},
): Promise<PreviewResult> {
  const width = options.width ?? 680;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  // Chrome stops animation frames in cross-origin frames outside the viewport,
  // which would freeze script-driven charts mid-animation, so the frame stays
  // in view, nearly transparent and behind the page.
  container.style.cssText = `position:fixed;left:0;top:0;width:${width}px;opacity:0.01;pointer-events:none;z-index:-2147483647;`;
  document.body.appendChild(container);

  const widget = createWidget({
    container,
    tokens: options.tokens ?? defaultThemeTokens(options.appearance ?? "light"),
    animate: false,
    onOpenLink: () => {},
    onPrompt: () => {},
    ...(options.product !== undefined ? { product: options.product } : {}),
    ...(options.frame !== undefined ? { frame: options.frame } : {}),
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.csp !== undefined ? { csp: options.csp } : {}),
    ...(options.compat !== undefined ? { compat: options.compat } : {}),
    ...(options.css !== undefined ? { css: options.css } : {}),
    ...(options.readyTimeoutMs !== undefined
      ? { readyTimeoutMs: options.readyTimeoutMs }
      : {}),
  });

  try {
    widget.write(code);
    await widget.end();
    await new Promise((resolve) =>
      setTimeout(resolve, options.settleMs ?? 600),
    );
    const inspection = await widget.inspect();
    let screenshot: string | undefined;
    let screenshotError: string | undefined;
    if (options.screenshot !== false) {
      try {
        screenshot = (await widget.screenshot()).dataUrl;
      } catch (error) {
        screenshotError =
          error instanceof Error ? error.message : String(error);
      }
    }
    return {
      ok: inspection.errors.length === 0 && !inspection.blank,
      kind: inspection.kind,
      width: inspection.size.width,
      height: inspection.size.height,
      blank: inspection.blank,
      errors: inspection.errors,
      console: inspection.console,
      ...(screenshot !== undefined ? { screenshot } : {}),
      ...(screenshotError !== undefined ? { screenshotError } : {}),
    };
  } finally {
    widget.dispose();
    container.remove();
  }
}
