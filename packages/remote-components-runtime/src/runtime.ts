import {
  FOCUS_ENTER_EVENT,
  FOCUS_EXIT_EVENT,
  FunctionProxies,
  functionPathSet,
  sameTabStop,
  tabbables,
  deepActiveElement,
  FunctionTargets,
  RemoteComponentError,
  serializeError,
  type Encoded,
  type InitPayload,
  type RemoteChannel,
} from "@assistant-ui/remote-components-protocol";
import type { Connection } from "./connect.js";
import type { CssShim } from "./css.js";
import { Measurer } from "./measure.js";
import type { OverlayManager } from "./overlays.js";
import { loadOverlays } from "./chunks.js";
import { ThemeApplier } from "./theme.js";

/**
 * The connected side of the runtime: props, theme, layout measurement,
 * overlays and focus for one host connection. `rc.ts` creates it
 * once the handshake completes and exposes it as `window.rc`.
 */
export class RemoteRuntime {
  readonly doc: Document;
  readonly channel: RemoteChannel;
  readonly init: InitPayload;
  private overlayManager: Promise<OverlayManager> | null = null;
  private loadedOverlays: OverlayManager | null = null;
  readonly targets = new FunctionTargets();
  private readonly proxies: FunctionProxies;
  readonly measurer: Measurer;
  readonly theme: ThemeApplier;
  private props: Record<string, unknown>;
  /** Function paths (`JSON.stringify([key, ...path])`) per prop key, as the host sent them. */
  private readonly propFunctions = new Map<string, string[]>();
  private readonly propsListeners = new Set<() => void>();
  private readonly themeListeners = new Set<() => void>();
  private lastSeq = 0;
  private readySent = false;
  private readonly fontTimeout = 1000;
  /** Cancels stale focus retries. */
  private focusToken = 0;
  /** Counts pointer-downs and key presses in this document (a focus request yields to them). */
  private userInput = 0;
  /** Removes window/document listeners and restores globals on dispose. */
  private readonly cleanups: (() => void)[] = [];

  private readonly css: CssShim | null;

  constructor(doc: Document, conn: Connection, css: CssShim | null) {
    this.css = css;
    this.doc = doc;
    const channel = (this.channel = conn.channel);
    this.init = conn.init;
    const win = doc.defaultView!;
    this.theme = new ThemeApplier(doc);
    this.measurer = new Measurer(doc, css, (size) => {
      if (this.readySent)
        channel.notify("rc/notifications/size-changed", { size });
    });
    this.targets.register(
      "props",
      () => this.props,
      (path) =>
        this.propFunctions
          .get(String(path[0]))
          ?.includes(JSON.stringify(path)) === true,
    );

    this.proxies = new FunctionProxies((ref, args, signal) =>
      channel.request("rc/call", { ref, args }, signal ? { signal } : {}),
    );
    channel.handle("rc/call", ({ ref, args }, { signal }) =>
      this.targets.invoke(ref, args, signal),
    );
    channel.handle("rc/focus", ({ target, focusVisible }) => {
      this.focus(target, focusVisible);
      return null;
    });
    this.props = {};
    this.applyProps(this.init.props, []);
    this.theme.apply(this.init.theme);
    this.measurer.setLayout(this.init.layout);
    this.measurer.start();

    channel.on("rc/notifications/props-changed", ({ seq, set, del }) => {
      if (seq <= this.lastSeq) return; // stale or duplicate
      this.lastSeq = seq;
      this.applyProps(set, del);
    });
    channel.on("rc/notifications/theme-changed", ({ theme }) => {
      this.theme.apply(theme);
      this.measurer.schedule();
      for (const l of [...this.themeListeners]) l();
    });
    channel.on("rc/notifications/layout-changed", ({ layout }) =>
      this.measurer.setLayout(layout),
    );

    const listen = <K extends string>(
      target: EventTarget,
      type: K,
      fn: (ev: never) => void,
    ): void => {
      target.addEventListener(type, fn as EventListener);
      this.cleanups.push(() =>
        target.removeEventListener(type, fn as EventListener),
      );
    };
    const onInput = (): void => {
      this.userInput++;
    };
    // The last pointerdown, to tell focus from a click (see focusin below).
    let pointer: { target: EventTarget | null; at: number } | null = null;
    const onPointer = (ev: PointerEvent): void => {
      pointer = { target: ev.target, at: performance.now() };
    };
    win.addEventListener("pointerdown", onInput, true);
    win.addEventListener("pointerdown", onPointer, true);
    win.addEventListener("keydown", onInput, true);
    this.cleanups.push(() => {
      win.removeEventListener("pointerdown", onInput, true);
      win.removeEventListener("pointerdown", onPointer, true);
      win.removeEventListener("keydown", onInput, true);
    });
    listen(win, "keydown", (ev: KeyboardEvent) => {
      if (ev.defaultPrevented) return;
      if (ev.key === "Escape")
        channel.notify("rc/notifications/escape-pressed", {});
      else if (ev.key === "Tab" && !ev.altKey && !ev.ctrlKey && !ev.metaKey)
        this.onTab(ev);
    });
    // Firefox stops on the frame document itself when tabbing in. Tell the
    // host, which knows the direction of the Tab that brought focus here.
    listen(win, "focus", (ev: FocusEvent) => {
      if (ev.target !== win) return;
      const a = win.document.activeElement;
      if (
        a === null ||
        a === win.document.body ||
        a === win.document.documentElement
      )
        channel.notify("rc/notifications/focus-enter", {});
    });
    // Keep the focused element visible in the host's scrollers (WebKit does
    // not scroll ancestors across a cross-origin frame for focus). Not for
    // focus from a click on the element: inline, that does not scroll.
    listen(win.document, "focusin", (ev: FocusEvent) => {
      const el = ev.target;
      if (!(el instanceof win.Element) || el === win.document.body) return;
      // The first focus after a pointerdown is the click's, if any.
      const p = pointer;
      pointer = null;
      if (
        p !== null &&
        performance.now() - p.at < 1000 &&
        p.target instanceof win.Node &&
        el.contains(p.target)
      )
        return;
      this.reveal(el);
    });
    // A host nested in this document ran out of tab stops: continue in ours.
    listen(win, FOCUS_EXIT_EVENT, (ev: Event) => {
      const direction = (ev as CustomEvent<{ direction?: unknown }>).detail
        ?.direction;
      if (direction === "next" || direction === "previous")
        channel.notify("rc/notifications/focus-exit", { direction });
    });
    listen(win, "error", (ev: ErrorEvent) =>
      this.reportError(ev.error ?? ev.message),
    );
    listen(win, "unhandledrejection", (ev: PromiseRejectionEvent) =>
      this.reportError(ev.reason),
    );
  }

  getProps = (): Record<string, unknown> => this.props;

  subscribeProps = (listener: () => void): (() => void) => {
    this.propsListeners.add(listener);
    return () => this.propsListeners.delete(listener);
  };

  subscribeTheme = (listener: () => void): (() => void) => {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  };

  private applyProps(set: Record<string, Encoded>, del: string[]): void {
    const next: Record<string, unknown> = { ...this.props };
    for (const key of del) {
      delete next[key];
      this.propFunctions.delete(key);
    }
    for (const [key, enc] of Object.entries(set)) {
      this.propFunctions.set(key, [...functionPathSet(enc, [key])]);
      const value = this.proxies.decode("props", enc, [key]);
      if (key === "__proto__")
        Object.defineProperty(next, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      else next[key] = value;
    }
    this.props = next;
    for (const l of [...this.propsListeners]) l();
  }

  /**
   * Called once the page has rendered (rc.ts: `load`, then two tasks).
   * Waits for fonts (bounded), measures, and sends `ready` with the first
   * size so the host can lay out before revealing.
   */
  async signalRendered(): Promise<void> {
    if (this.readySent) return;
    const fonts = (this.doc as Document & { fonts?: FontFaceSet }).fonts;
    const waits: Promise<unknown>[] = [];
    if (fonts !== undefined && fonts.status === "loading")
      waits.push(fonts.ready);
    // The container emulation chunk, when the page needs it.
    if (this.css !== null) waits.push(this.css.settled);
    if (waits.length > 0)
      await Promise.race([
        Promise.all(waits),
        new Promise((r) => setTimeout(r, this.fontTimeout)),
      ]);
    if (this.readySent) return;
    this.readySent = true;
    const size = this.measurer.flush();
    this.channel.notify("rc/notifications/ready", { size });
  }

  /** Uncaught errors and unhandled rejections: reported to the host, never fatal. */
  reportError(err: unknown): void {
    const e =
      err instanceof Error
        ? err
        : new RemoteComponentError("runtime", String(err));
    const serialized = serializeError(e);
    if (serialized.code === undefined) serialized.code = "runtime";
    this.channel.notify("rc/notifications/error", { error: serialized });
  }

  /**
   * Tab past the last stop (or Shift+Tab before the first) leaves the
   * document: the host moves focus to its adjacent stop. Engines disagree
   * on how Tab leaves a frame (Firefox stops on the frame element), so the
   * runtime does it explicitly.
   */
  private onTab(ev: KeyboardEvent): void {
    const doc = this.doc;
    const list = tabbables(doc);
    const active = deepActiveElement(doc);
    const atBody =
      active === null || active === doc.body || active === doc.documentElement;
    const edge = ev.shiftKey ? list[0] : list[list.length - 1];
    if (list.length === 0 || (!atBody && sameTabStop(active, edge))) {
      ev.preventDefault();
      this.channel.notify("rc/notifications/focus-exit", {
        direction: ev.shiftKey ? "previous" : "next",
      });
    }
  }

  /**
   * Focuses the first/last tab stop (or restores focus after an overlay).
   * Retries for a few frames: right after a frame is revealed, some engines
   * (WebKit) refuse focus until the frame is visible to them. A remote
   * with no tab stops passes focus on (Tab moving through an empty remote).
   *
   * `focusVisible`: whether the element should show its focus ring. The
   * keyboard event that moved focus happened in the host, so this
   * document's own heuristic would guess wrong (after a click in the
   * remote, a later Tab into it would show no ring). Absent: the browser
   * decides.
   */
  focus(target: "first" | "last" | "restore", focusVisible?: boolean): void {
    const doc = this.doc;
    const win = doc.defaultView!;
    const options =
      focusVisible === undefined
        ? undefined
        : ({ focusVisible } as FocusOptions);
    if (target === "restore") {
      if (this.loadedOverlays?.restoreFocus(options) === true) return;
      const list = tabbables(doc);
      list[0]?.focus(options);
      return;
    }
    const pick = (): HTMLElement | undefined => {
      const list = tabbables(doc);
      return target === "first" ? list[0] : list[list.length - 1];
    };
    const first = pick();
    if (first === undefined) {
      this.channel.notify("rc/notifications/focus-exit", {
        direction: target === "first" ? "next" : "previous",
      });
      return;
    }
    const token = ++this.focusToken;
    const inputAtStart = this.userInput;
    let frames = 0;
    const attempt = (): void => {
      if (token !== this.focusToken) return;
      // The user clicked or typed meanwhile: leave focus where it is.
      if (this.userInput !== inputAtStart) return;
      const el = pick();
      if (el === undefined) return;
      // Always focus on the first try: a frame keeps its activeElement while
      // it is not focused, so that alone does not mean focus is here.
      if (frames === 0 || doc.activeElement !== el) {
        el.focus(options);
        // Firefox fires no focusin when the frame gets focus back with the
        // same element focused, so reveal here too.
        if (frames === 0) this.reveal(el);
        // The stop is a nested remote: ask its host (in this document) to enter it.
        if (el instanceof win.HTMLIFrameElement) {
          el.dispatchEvent(
            new CustomEvent(FOCUS_ENTER_EVENT, {
              detail: {
                target,
                ...(focusVisible === undefined ? {} : { focusVisible }),
              },
            }),
          );
          return;
        }
      }
      // Hold the stop for a few frames: WebKit refuses focus right after a
      // frame is revealed, and Firefox moves focus back to the frame's
      // previously focused element once the frame itself gets focus.
      if (++frames < 30) win.requestAnimationFrame(attempt);
    };
    attempt();
  }

  /** The overlay manager, loaded on first use (chunks.ts). */
  overlays(): Promise<OverlayManager> {
    return (this.overlayManager ??= loadOverlays().then(
      ({ OverlayManager }) => {
        const win = this.doc.defaultView!;
        const base = this.init.src || win.location.href;
        return (this.loadedOverlays = new OverlayManager(
          this.channel,
          this.targets,
          win,
          base,
        ));
      },
    ));
  }

  /** Asks the host to scroll `el` into view in its scrollers. */
  private reveal(el: Element): void {
    const r = el.getBoundingClientRect();
    this.channel.notify("rc/notifications/focus-changed", {
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    });
  }

  dispose(): void {
    for (const c of this.cleanups.splice(0)) c();
    this.focusToken++;
    this.measurer.stop();
    this.loadedOverlays?.dispose();
    this.channel.close();
  }
}
