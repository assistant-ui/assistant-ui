import type { ConsoleEntry, ConsoleLevel, WidgetError } from "../protocol";

const MAX_CONSOLE = 200;
const MAX_ERRORS = 50;
const MAX_MESSAGE = 1000;

const LEVELS: readonly ConsoleLevel[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
];

const truncate = (text: string) =>
  text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}…` : text;

export const formatValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error)
    return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === "object" && value !== null) {
    if (typeof Node !== "undefined" && value instanceof Node) {
      return `<${value.nodeName.toLowerCase()}>`;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export type Diagnostics = {
  readonly errors: WidgetError[];
  readonly console: ConsoleEntry[];
  record(error: WidgetError): void;
  dispose(): void;
};

export type DiagnosticsOptions = {
  onError?: (error: WidgetError) => void;
  onConsole?: (entry: ConsoleEntry) => void;
};

/** Captures errors, console output, failed resources, and CSP violations in a window. */
export function installDiagnostics(
  win: Window & typeof globalThis,
  options: DiagnosticsOptions = {},
): Diagnostics {
  const errors: WidgetError[] = [];
  const consoleEntries: ConsoleEntry[] = [];

  const record = (error: WidgetError) => {
    const normalized: WidgetError = {
      ...error,
      message: truncate(error.message),
    };
    if (errors.length < MAX_ERRORS) errors.push(normalized);
    options.onError?.(normalized);
  };

  const onError = (event: ErrorEvent | Event) => {
    const target = event.target;
    if (target && target !== win && target instanceof win.Element) {
      const src =
        target.getAttribute("src") ?? target.getAttribute("href") ?? undefined;
      record({
        kind: "resource",
        message: `Failed to load <${target.localName}>${src ? ` ${src}` : ""}`,
        ...(src ? { source: src } : {}),
      });
      return;
    }
    const e = event as ErrorEvent;
    const stack = e.error instanceof Error ? e.error.stack : undefined;
    record({
      kind: "error",
      message: e.message || formatValue(e.error),
      ...(e.filename ? { source: e.filename } : {}),
      ...(e.lineno ? { line: e.lineno } : {}),
      ...(e.colno ? { column: e.colno } : {}),
      ...(stack ? { stack: truncate(stack) } : {}),
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    const stack = reason instanceof Error ? reason.stack : undefined;
    record({
      kind: "unhandledrejection",
      message: reason instanceof Error ? reason.message : formatValue(reason),
      ...(stack ? { stack: truncate(stack) } : {}),
    });
  };

  const onViolation = (event: SecurityPolicyViolationEvent) => {
    record({
      kind: "csp",
      message: `Blocked by Content Security Policy (${event.effectiveDirective}): ${event.blockedURI || "inline"}`,
      ...(event.blockedURI ? { source: event.blockedURI } : {}),
      ...(event.lineNumber ? { line: event.lineNumber } : {}),
    });
  };

  win.addEventListener("error", onError, true);
  win.addEventListener("unhandledrejection", onRejection);
  win.document.addEventListener("securitypolicyviolation", onViolation);

  const originals = new Map<ConsoleLevel, (...args: unknown[]) => void>();
  for (const level of LEVELS) {
    const original = win.console[level];
    originals.set(level, original);
    win.console[level] = (...args: unknown[]) => {
      const entry: ConsoleEntry = {
        level,
        message: truncate(args.map(formatValue).join(" ")),
      };
      consoleEntries.push(entry);
      if (consoleEntries.length > MAX_CONSOLE) consoleEntries.shift();
      options.onConsole?.(entry);
      original.apply(win.console, args);
    };
  }

  return {
    errors,
    console: consoleEntries,
    record,
    dispose() {
      win.removeEventListener("error", onError, true);
      win.removeEventListener("unhandledrejection", onRejection);
      win.document.removeEventListener("securitypolicyviolation", onViolation);
      for (const [level, original] of originals) win.console[level] = original;
    },
  };
}

const VISUAL_SELECTOR =
  "svg, canvas, img, video, picture, iframe, input, button, select, textarea, progress, meter";

/** True when the widget rendered nothing a person could see. */
export function isBlankRender(root: HTMLElement): boolean {
  const rect = root.getBoundingClientRect();
  if (rect.height < 2 || rect.width < 2) return true;
  if ((root.textContent ?? "").trim().length > 0) return false;
  for (const el of Array.from(root.querySelectorAll(VISUAL_SELECTOR))) {
    const r = el.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) return false;
  }
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const style = root.ownerDocument.defaultView?.getComputedStyle(el);
    if (!style) continue;
    const painted =
      (style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor !== "transparent") ||
      style.backgroundImage !== "none" ||
      parseFloat(style.borderTopWidth) > 0;
    if (!painted) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) return false;
  }
  return true;
}
