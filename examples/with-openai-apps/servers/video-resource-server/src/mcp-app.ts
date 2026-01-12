/**
 * Video Resource Player
 *
 * Demonstrates fetching binary content (video) via MCP resources.
 * The video is served as a base64 blob and converted to a data URI for playback.
 */
import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ReadResourceResultSchema } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

const log = {
  info: console.log.bind(console, "[VIDEO]"),
  error: console.error.bind(console, "[VIDEO]"),
};

// Get element references
const loadingEl = document.getElementById("loading")!;
const loadingTextEl = document.getElementById("loading-text")!;
const errorEl = document.getElementById("error")!;
const errorMessageEl = document.getElementById("error-message")!;
const playerEl = document.getElementById("player")!;
const videoEl = document.getElementById("video") as HTMLVideoElement;
const videoInfoEl = document.getElementById("video-info")!;

// Parse tool result to get video URI
function parseToolResult(
  result: CallToolResult,
): { videoUri: string; description: string } | null {
  const text = result.content
    ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");

  if (!text) return null;

  try {
    return JSON.parse(text) as { videoUri: string; description: string };
  } catch {
    return null;
  }
}

// Show states
function showLoading(text: string) {
  loadingTextEl.textContent = text;
  loadingEl.style.display = "flex";
  errorEl.style.display = "none";
  playerEl.style.display = "none";
}

function showError(message: string) {
  errorMessageEl.textContent = message;
  loadingEl.style.display = "none";
  errorEl.style.display = "block";
  playerEl.style.display = "none";
}

function showPlayer(dataUri: string, info: string) {
  videoEl.src = dataUri;
  videoInfoEl.textContent = info;
  loadingEl.style.display = "none";
  errorEl.style.display = "none";
  playerEl.style.display = "block";
}

// Create app instance
const app = new App({ name: "Video Resource Player", version: "1.0.0" });

// Handle tool result - this is called when the tool execution completes
app.ontoolresult = async (result) => {
  log.info("Received tool result:", result);

  const parsed = parseToolResult(result);
  if (!parsed) {
    showError("Invalid tool result - could not parse video URI");
    return;
  }

  const { videoUri, description } = parsed;
  log.info("Video URI:", videoUri, "Description:", description);

  showLoading("Fetching video from MCP resource...");

  try {
    log.info("Requesting resource:", videoUri);

    const resourceResult = await app.request(
      { method: "resources/read", params: { uri: videoUri } },
      ReadResourceResultSchema,
    );

    const firstContent = resourceResult.contents[0];
    const blobSize =
      firstContent && "blob" in firstContent ? firstContent.blob?.length : 0;
    log.info("Resource received, blob size:", blobSize);

    const content = resourceResult.contents[0];
    const blob = content && "blob" in content ? content.blob : undefined;
    if (!blob) {
      throw new Error("Resource response did not contain blob data");
    }

    showLoading("Converting to data URI...");

    const mimeType = content.mimeType || "video/mp4";
    const dataUri = `data:${mimeType};base64,${blob}`;

    log.info("Data URI created, length:", dataUri.length);

    showPlayer(dataUri, `Loaded via MCP resource (${description})`);
  } catch (err) {
    log.error("Error fetching resource:", err);
    showError(err instanceof Error ? err.message : String(err));
  }
};

app.onerror = (err) => {
  log.error("App error:", err);
  showError(err instanceof Error ? err.message : String(err));
};

// Connect to host
app.connect();
