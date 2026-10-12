import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { openChromePage } from "./chrome.ts";
import type { Format, Rendered } from "./types.ts";

/** The chat column answers render in, the width generative-frame previews widgets at. */
export const RENDER_WIDTH = 680;
// Vision models shrink an image whose long side passes about 1,500 px, which would leave a tall answer's text unreadable, so an answer is captured in slices of this height.
const SLICE_HEIGHT = 1_000;
/** An answer taller than this many slices is cut off. */
export const MAX_SLICES = 8;

const PAGE = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>answer</title></head>
  <body><div id="answer"></div><script type="module" src="/harness.js"></script></body>
</html>`;

async function bundleHarness(): Promise<string> {
  const { rolldown } = await import("rolldown");
  const bundle = await rolldown({
    input: fileURLToPath(new URL("./harness.tsx", import.meta.url)),
    platform: "browser",
    transform: {
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
    },
    logLevel: "silent",
  });
  try {
    const { output } = await bundle.generate({
      format: "esm",
      codeSplitting: false,
    });
    return output[0].code;
  } finally {
    await bundle.close();
  }
}

export interface Renderer {
  render(format: Format, artifact: string): Promise<Rendered>;
  close(): Promise<void>;
}

/** Renders answers one at a time in a headless Chrome, the way a chat app shows them. */
export async function createRenderer(): Promise<Renderer> {
  const script = await bundleHarness();
  const server = createServer((request, response) => {
    const isScript = request.url === "/harness.js";
    response.writeHead(200, {
      "content-type": isScript ? "text/javascript" : "text/html",
    });
    response.end(isScript ? script : PAGE);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;
  const stopServer = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });

  try {
    const page = await openChromePage(
      `http://127.0.0.1:${port}/`,
      RENDER_WIDTH,
    );
    const renderOne = async (format: Format, artifact: string) => {
      const { height, errors } = await page.evaluate<{
        height: number;
        errors: string[];
      }>(
        `window.renderAnswer(${JSON.stringify(format)}, ${JSON.stringify(artifact)})`,
        60_000,
      );
      const captured = Math.min(Math.max(height, 1), MAX_SLICES * SLICE_HEIGHT);
      const screenshots: string[] = [];
      for (let y = 0; y < captured; y += SLICE_HEIGHT) {
        screenshots.push(
          await page.screenshot(
            y,
            RENDER_WIDTH,
            Math.min(SLICE_HEIGHT, captured - y),
          ),
        );
      }
      return {
        screenshots,
        cutOff: height > captured,
        runtimeErrors: errors,
      };
    };
    // The page renders one answer at a time, so concurrent trials queue for it.
    let last: Promise<unknown> = Promise.resolve();
    return {
      render(format, artifact) {
        const next = last.then(() => renderOne(format, artifact));
        last = next.catch(() => {});
        return next;
      },
      async close() {
        await page.close();
        await stopServer();
      },
    };
  } catch (error) {
    await stopServer();
    throw error;
  }
}
