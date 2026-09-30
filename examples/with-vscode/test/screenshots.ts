import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";
import { RICH_FIXTURES } from "../src/fixtures/fixtures";
import {
  NARROW_WIDTH,
  type GalleryShown,
  type GallerySectionInfo,
  type GalleryView,
  type ViewportRect,
  type WebviewTaskId,
} from "../src/protocol";

const THEMES = [
  { name: "dark", colorTheme: "Default Dark Modern" },
  { name: "light", colorTheme: "Default Light Modern" },
] as const;

const GALLERY_THEMES = [
  { name: "dark-modern", colorTheme: "Default Dark Modern" },
  { name: "light-modern", colorTheme: "Default Light Modern" },
  { name: "hc-dark", colorTheme: "Default High Contrast" },
] as const;

const GALLERY_WIDTHS = [
  { name: "editor", width: null },
  { name: "narrow", width: NARROW_WIDTH },
] as const;

const REPAINT_MS = 1_500;

/**
 * The workbench viewport during the gallery capture, so tall sections fit and
 * the sidebar Assistant view has room for a reply.
 */
const GALLERY_VIEWPORT = { width: 1600, height: 2000 };

type CdpTarget = { type: string; url: string; webSocketDebuggerUrl: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One DevTools Protocol session with the workbench page. */
class Workbench {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void }
  >();

  private constructor(private readonly socket: WebSocket) {
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        result?: unknown;
        error?: { message: string };
      };
      const request = message.id && this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id as number);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    };
  }

  static async connect(port: number) {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = (await response.json()) as CdpTarget[];
    const page = targets.find(
      (t) => t.type === "page" && t.url.includes("workbench.html"),
    );
    if (!page) throw new Error(`No workbench page on DevTools port ${port}`);
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = () =>
        reject(new Error(`Could not connect to ${page.webSocketDebuggerUrl}`));
    });
    return new Workbench(socket);
  }

  send<T>(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async capture(clip?: ViewportRect) {
    const { data } = await this.send<{ data: string }>(
      "Page.captureScreenshot",
      {
        format: "png",
        ...(clip && { clip: { ...clip, scale: 1 } }),
      },
    );
    return Buffer.from(data, "base64");
  }

  /**
   * The visible webview iframe whose size matches `viewport`, in workbench
   * coordinates. The webview's content frame fills that iframe.
   */
  async webviewFrame(viewport: { width: number; height: number }) {
    const { result } = await this.send<{ result: { value: string } }>(
      "Runtime.evaluate",
      {
        expression: `JSON.stringify([...document.querySelectorAll("iframe")].map((f) => {
          const r = f.getBoundingClientRect();
          const s = getComputedStyle(f);
          return { x: r.x, y: r.y, width: r.width, height: r.height,
            visible: s.visibility !== "hidden" && s.display !== "none" };
        }))`,
        returnByValue: true,
      },
    );
    const frames = JSON.parse(result.value) as (ViewportRect & {
      visible: boolean;
    })[];
    const frame = frames.find(
      (f) =>
        f.visible &&
        Math.abs(f.width - viewport.width) <= 1 &&
        Math.abs(f.height - viewport.height) <= 1,
    );
    if (!frame) {
      throw new Error(
        `No visible webview frame of ${viewport.width}x${viewport.height} (frames: ${JSON.stringify(frames)})`,
      );
    }
    return frame;
  }

  /** Lays the workbench out at `viewport` until `run` settles. */
  async withViewport(
    viewport: { width: number; height: number },
    run: () => Promise<void>,
  ) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      deviceScaleFactor: 0,
      mobile: false,
    });
    try {
      await sleep(REPAINT_MS);
      await run();
    } finally {
      await this.send("Emulation.clearDeviceMetricsOverride");
    }
  }

  close() {
    this.socket.close();
  }
}

const runTask = <T>(
  target: "assistant" | "gallery",
  task: WebviewTaskId,
  arg?: unknown,
) =>
  vscode.commands.executeCommand<T>("auiTest.runWebviewTask", {
    target,
    task,
    arg,
  }) as Promise<T>;

/** Clips `rect` in a frame to the frame's viewport and moves it into the workbench. */
const clipTo = (
  frame: ViewportRect,
  rect: ViewportRect,
  viewport: { width: number; height: number },
): ViewportRect => {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  return {
    x: frame.x + x,
    y: frame.y + y,
    width: Math.max(1, Math.min(rect.width, viewport.width - x)),
    height: Math.max(1, Math.min(rect.height, viewport.height - y)),
  };
};

const withColorTheme = async (run: () => Promise<void>) => {
  const config = vscode.workspace.getConfiguration("workbench");
  const original = config.inspect<string>("colorTheme")?.globalValue;
  try {
    await run();
  } finally {
    await config.update(
      "colorTheme",
      original,
      vscode.ConfigurationTarget.Global,
    );
  }
};

const setColorTheme = async (colorTheme: string) => {
  await vscode.workspace
    .getConfiguration("workbench")
    .update("colorTheme", colorTheme, vscode.ConfigurationTarget.Global);
  await sleep(REPAINT_MS);
};

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );

/** A static page with every capture of a section or fixture side by side. */
const contactSheet = (
  sections: GallerySectionInfo[],
  fixtures: readonly { name: string; description: string }[],
  truncated: ReadonlySet<string>,
) => {
  const cell = (src: string, caption: string) =>
    `<figure><a href="${src}"><img src="${src}" loading="lazy" alt="${escapeHtml(caption)}"></a><figcaption>${escapeHtml(caption)}${truncated.has(src) ? " (cut at the viewport)" : ""}</figcaption></figure>`;
  const sectionRows = sections
    .map(
      (s) =>
        `<section id="${s.id}"><h3>${escapeHtml(s.title)} <code>${s.id}</code> <small>${s.category}</small></h3><div class="row">${GALLERY_THEMES.flatMap(
          (t) =>
            GALLERY_WIDTHS.map((w) =>
              cell(`${t.name}/${w.name}/${s.id}.png`, `${t.name} ${w.name}`),
            ),
        ).join("")}</div></section>`,
    )
    .join("\n");
  const fixtureRows = fixtures
    .map(
      (f) =>
        `<section id="fixture-${f.name}"><h3>${escapeHtml(f.name)} <small>${escapeHtml(f.description)}</small></h3><div class="row">${GALLERY_THEMES.map(
          (t) => cell(`${t.name}/assistant/${f.name}.png`, t.name),
        ).join("")}</div></section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Component gallery screenshots</title>
<style>
body { font: 13px system-ui, sans-serif; margin: 16px; background: #f4f4f5; color: #18181b; }
h3 { margin: 24px 0 8px; font-size: 14px; } small { color: #71717a; font-weight: normal; }
.row { display: flex; gap: 12px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; }
figure { margin: 0; flex: none; } figcaption { color: #71717a; margin-top: 4px; }
img { display: block; max-width: 420px; max-height: 560px; border: 1px solid #d4d4d8; background: #fff; }
nav a { margin-right: 8px; }
</style></head><body>
<h1>Component gallery screenshots</h1>
<nav>${sections.map((s) => `<a href="#${s.id}">${s.id}</a>`).join("")}${fixtures.map((f) => `<a href="#fixture-${f.name}">fixture ${f.name}</a>`).join("")}</nav>
<h2>Gallery sections</h2>
${sectionRows}
<h2>Assistant view, rich fixtures</h2>
${fixtureRows}
</body></html>
`;
};

/**
 * Captures every gallery section under each gallery theme at editor and
 * sidebar width, and the Assistant view after each rich fixture, into
 * `<outDir>/gallery/`, plus an `index.html` contact sheet.
 */
const captureGallery = async (workbench: Workbench, outDir: string) => {
  const galleryDir = path.join(outDir, "gallery");
  const files: string[] = [];
  const truncated = new Set<string>();
  const sections = await runTask<GallerySectionInfo[]>(
    "gallery",
    "gallery-sections",
  );

  for (const theme of GALLERY_THEMES) {
    await setColorTheme(theme.colorTheme);

    for (const { name, width } of GALLERY_WIDTHS) {
      const dir = path.join(galleryDir, theme.name, name);
      await mkdir(dir, { recursive: true });
      for (const section of sections) {
        const view: GalleryView = {
          section: section.id,
          width,
          noMotion: true,
        };
        const shown = await runTask<GalleryShown>(
          "gallery",
          "gallery-show",
          view,
        );
        if (!shown.rect)
          throw new Error(`Section ${section.id} did not render`);
        const frame = await workbench.webviewFrame(shown.viewport);
        const file = path.join(dir, `${section.id}.png`);
        const clip = clipTo(frame, shown.rect, shown.viewport);
        if (clip.height < shown.rect.height - 1) {
          truncated.add(path.relative(galleryDir, file));
        }
        await writeFile(file, await workbench.capture(clip));
        files.push(file);
      }
    }
    await runTask("gallery", "gallery-show", { section: null, width: null });

    const dir = path.join(galleryDir, theme.name, "assistant");
    await mkdir(dir, { recursive: true });
    for (const fixture of RICH_FIXTURES) {
      const viewport = await runTask<{ width: number; height: number }>(
        "assistant",
        "run-fixture",
        fixture.prompt,
      );
      const frame = await workbench.webviewFrame(viewport);
      const file = path.join(dir, `${fixture.name}.png`);
      await writeFile(file, await workbench.capture(frame));
      files.push(file);
    }
  }

  const index = path.join(galleryDir, "index.html");
  await writeFile(index, contactSheet(sections, RICH_FIXTURES, truncated));
  files.push(index);
  return files;
};

/**
 * Saves a window screenshot with the Assistant view open under a dark and a
 * light theme, then the gallery matrix, and restores the user's theme.
 */
export const captureThemeScreenshots = async (port: number, outDir: string) => {
  await mkdir(outDir, { recursive: true });
  const workbench = await Workbench.connect(port);
  const files: string[] = [];
  try {
    await withColorTheme(async () => {
      for (const theme of THEMES) {
        await vscode.commands.executeCommand("auiTest.showAssistant");
        await setColorTheme(theme.colorTheme);
        const file = path.join(outDir, `assistant-${theme.name}.png`);
        await writeFile(file, await workbench.capture());
        files.push(file);
      }
      await workbench.withViewport(GALLERY_VIEWPORT, async () => {
        files.push(...(await captureGallery(workbench, outDir)));
      });
    });
  } finally {
    workbench.close();
  }
  return files;
};
