import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";

const THEMES = [
  { name: "dark", colorTheme: "Default Dark Modern" },
  { name: "light", colorTheme: "Default Light Modern" },
] as const;

const REPAINT_MS = 1_500;

type CdpTarget = { type: string; url: string; webSocketDebuggerUrl: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Captures the workbench window over the Chrome DevTools Protocol. */
const captureWorkbench = async (port: number) => {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = (await response.json()) as CdpTarget[];
  const page = targets.find(
    (t) => t.type === "page" && t.url.includes("workbench.html"),
  );
  if (!page) throw new Error(`No workbench page on DevTools port ${port}`);

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  try {
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = () =>
        reject(new Error(`Could not connect to ${page.webSocketDebuggerUrl}`));
    });
    const data = await new Promise<string>((resolve, reject) => {
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as {
          id?: number;
          result?: { data: string };
          error?: { message: string };
        };
        if (message.id !== 1) return;
        if (message.result) resolve(message.result.data);
        else reject(new Error(message.error?.message ?? "No screenshot data"));
      };
      socket.send(
        JSON.stringify({
          id: 1,
          method: "Page.captureScreenshot",
          params: { format: "png" },
        }),
      );
    });
    return Buffer.from(data, "base64");
  } finally {
    socket.close();
  }
};

/**
 * Shows the Assistant view under a dark and a light theme and saves a
 * screenshot of the window for each, then restores the user's theme.
 */
export const captureThemeScreenshots = async (port: number, outDir: string) => {
  const config = vscode.workspace.getConfiguration("workbench");
  const original = config.inspect<string>("colorTheme")?.globalValue;
  const target = vscode.ConfigurationTarget.Global;
  await mkdir(outDir, { recursive: true });

  const files: string[] = [];
  try {
    for (const theme of THEMES) {
      await config.update("colorTheme", theme.colorTheme, target);
      await vscode.commands.executeCommand("auiTest.showAssistant");
      await sleep(REPAINT_MS);
      const file = path.join(outDir, `assistant-${theme.name}.png`);
      await writeFile(file, await captureWorkbench(port));
      files.push(file);
    }
  } finally {
    await config.update("colorTheme", original, target);
  }
  return files;
};
