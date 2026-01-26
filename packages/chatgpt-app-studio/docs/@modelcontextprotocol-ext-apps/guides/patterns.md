---
title: Patterns
---

# MCP Apps Patterns

This document covers common patterns and recipes for building MCP Apps.

## Tools that are private to Apps

Set {@link types!McpUiToolMeta.visibility `Tool._meta.ui.visibility`} to `["app"]` to make tools only callable by Apps (hidden from the model). This is useful for UI-driven actions like updating quantities, toggling settings, or other interactions that shouldn't appear in the model's tool list.

<!-- prettier-ignore -->
```ts source="../src/server/index.examples.ts#registerAppTool_appOnlyVisibility"
registerAppTool(
  server,
  "update-quantity",
  {
    description: "Update item quantity in cart",
    inputSchema: { itemId: z.string(), quantity: z.number() },
    _meta: {
      ui: {
        resourceUri: "ui://shop/cart.html",
        visibility: ["app"],
      },
    },
  },
  async ({ itemId, quantity }) => {
    const cart = await updateCartItem(itemId, quantity);
    return { content: [{ type: "text", text: JSON.stringify(cart) }] };
  },
);
```

_See [`examples/system-monitor-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/system-monitor-server) for a full implementation of this pattern._

## Reading large amounts of data via chunked tool calls

Some host platforms have size limits on tool call responses, so large files (PDFs, images, etc.) cannot be sent in a single response. Use an app-only tool with chunked responses to bypass these limits while keeping the data out of model context.

**Server-side**: Register an app-only tool that returns data in chunks with pagination metadata:

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#chunkedDataServer"
// Define the chunk response schema
const DataChunkSchema = z.object({
  bytes: z.string(), // base64-encoded data
  offset: z.number(),
  byteCount: z.number(),
  totalBytes: z.number(),
  hasMore: z.boolean(),
});

const MAX_CHUNK_BYTES = 500 * 1024; // 500KB per chunk

registerAppTool(
  server,
  "read_data_bytes",
  {
    title: "Read Data Bytes",
    description: "Load binary data in chunks",
    inputSchema: {
      id: z.string().describe("Resource identifier"),
      offset: z.number().min(0).default(0).describe("Byte offset"),
      byteCount: z
        .number()
        .default(MAX_CHUNK_BYTES)
        .describe("Bytes to read"),
    },
    outputSchema: DataChunkSchema,
    // Hidden from model - only callable by the App
    _meta: { ui: { visibility: ["app"] } },
  },
  async ({ id, offset, byteCount }): Promise<CallToolResult> => {
    const data = await loadData(id); // Your data loading logic
    const chunk = data.slice(offset, offset + byteCount);

    return {
      content: [{ type: "text", text: `${chunk.length} bytes at ${offset}` }],
      structuredContent: {
        bytes: Buffer.from(chunk).toString("base64"),
        offset,
        byteCount: chunk.length,
        totalBytes: data.length,
        hasMore: offset + chunk.length < data.length,
      },
    };
  },
);
```

**Client-side**: Loop calling the tool until all chunks are received:

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#chunkedDataClient"
interface DataChunk {
  bytes: string; // base64
  offset: number;
  byteCount: number;
  totalBytes: number;
  hasMore: boolean;
}

async function loadDataInChunks(
  id: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  const CHUNK_SIZE = 500 * 1024; // 500KB chunks
  const chunks: Uint8Array[] = [];
  let offset = 0;
  let totalBytes = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await app.callServerTool({
      name: "read_data_bytes",
      arguments: { id, offset, byteCount: CHUNK_SIZE },
    });

    if (result.isError || !result.structuredContent) {
      throw new Error("Failed to load data chunk");
    }

    const chunk = result.structuredContent as unknown as DataChunk;
    totalBytes = chunk.totalBytes;
    hasMore = chunk.hasMore;

    // Decode base64 to bytes
    const binaryString = atob(chunk.bytes);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    chunks.push(bytes);

    offset += chunk.byteCount;
    onProgress?.(offset, totalBytes);
  }

  // Combine all chunks into single array
  const fullData = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    fullData.set(chunk, pos);
    pos += chunk.length;
  }

  return fullData;
}

// Usage: load data with progress updates
loadDataInChunks(resourceId, (loaded, total) => {
  console.log(`Loading: ${Math.round((loaded / total) * 100)}%`);
}).then((data) => {
  console.log(`Loaded ${data.length} bytes`);
});
```

_See [`examples/pdf-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/pdf-server) for a full implementation of this pattern._

## Giving errors back to model

**Server-side**: Tool handler validates inputs and returns `{ isError: true, content: [...] }`. The model receives this error through the normal tool call response.

**Client-side**: If a runtime error occurs (e.g., API failure, permission denied, resource unavailable), use {@link app!App.updateModelContext `updateModelContext`} to inform the model:

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_updateModelContext_reportError"
try {
  const _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // ... use _stream for transcription
} catch (err) {
  // Inform the model that the app is in a degraded state
  await app.updateModelContext({
    content: [
      {
        type: "text",
        text: "Error: transcription unavailable",
      },
    ],
  });
}
```

## Matching host styling (CSS variables, theme, and fonts)

Use the SDK's style helpers to apply host styling, then reference them in your CSS:

- **CSS variables** — Use `var(--color-background-primary)`, etc. in your CSS
- **Theme** — Use `[data-theme="dark"]` selectors or `light-dark()` function for theme-aware styles
- **Fonts** — Use `var(--font-sans)` or `var(--font-mono)` with fallbacks (e.g., `font-family: var(--font-sans, system-ui, sans-serif)`)

**Vanilla JS:**

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#hostStylingVanillaJs"
function applyHostContext(ctx: McpUiHostContext) {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
}

// Apply when host context changes
app.onhostcontextchanged = applyHostContext;

// Apply initial styles after connecting
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    applyHostContext(ctx);
  }
});
```

**React:**

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#hostStylingReact"
function MyApp() {
  const { app } = useApp({
    appInfo: { name: "MyApp", version: "1.0.0" },
    capabilities: {},
  });

  // Apply all host styles (variables, theme, fonts)
  useHostStyles(app, app?.getHostContext());

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <p>Styled with host CSS variables and fonts</p>
      <p className="theme-aware">Uses [data-theme] selectors</p>
    </div>
  );
}
```

_See [`examples/basic-server-vanillajs/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-vanillajs) and [`examples/basic-server-react/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react) for full implementations of this pattern._

## Entering / Exiting fullscreen

Toggle fullscreen mode by calling {@link app!App.requestDisplayMode `requestDisplayMode`}:

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_requestDisplayMode_toggle"
const ctx = app.getHostContext();
if (ctx?.availableDisplayModes?.includes("fullscreen")) {
  const target = ctx.displayMode === "fullscreen" ? "inline" : "fullscreen";
  const result = await app.requestDisplayMode({ mode: target });
  console.log("Now in:", result.mode);
}
```

Listen for display mode changes via {@link app!App.onhostcontextchanged `onhostcontextchanged`} to update your UI:

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_onhostcontextchanged_respondToDisplayMode"
app.onhostcontextchanged = (params) => {
  if (params.displayMode) {
    const isFullscreen = params.displayMode === "fullscreen";
    document.body.classList.toggle("fullscreen", isFullscreen);
  }
};
```

_See [`examples/shadertoy-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/shadertoy-server) for a full implementation of this pattern._

## Passing contextual information from the App to the Model

Use {@link app!App.updateModelContext `updateModelContext`} to keep the model informed about what the user is viewing or interacting with. Structure the content with YAML frontmatter for easy parsing:

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_updateModelContext_appState"
const markdown = `---
item-count: ${itemList.length}
total-cost: ${totalCost}
currency: ${currency}
---

User is viewing their shopping cart with ${itemList.length} items selected:

${itemList.map((item) => `- ${item}`).join("\n")}`;

await app.updateModelContext({
  content: [{ type: "text", text: markdown }],
});
```

_See [`examples/map-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server) for a full implementation of this pattern._

## Sending large follow-up messages

When you need to send more data than fits in a message, use {@link app!App.updateModelContext `updateModelContext`} to set the context first, then {@link app!App.sendMessage `sendMessage`} with a brief prompt to trigger a response:

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_sendMessage_withLargeContext"
const markdown = `---
word-count: ${fullTranscript.split(/\s+/).length}
speaker-names: ${speakerNames.join(", ")}
---

${fullTranscript}`;

// Offload long transcript to model context
await app.updateModelContext({ content: [{ type: "text", text: markdown }] });

// Send brief trigger message
await app.sendMessage({
  role: "user",
  content: [{ type: "text", text: "Summarize the key points" }],
});
```

_See [`examples/transcript-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server) for a full implementation of this pattern._

## Persisting view state

To persist view state across conversation reloads (e.g., current page in a PDF viewer, camera position in a map), use [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) with a stable identifier provided by the server.

**Server-side**: Tool handler generates a unique `viewUUID` and returns it in `CallToolResult._meta.viewUUID`:

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#persistDataServer"
// In your tool callback, include viewUUID in the result metadata.
return {
  content: [{ type: "text", text: `Displaying PDF viewer for "${title}"` }],
  structuredContent: { url, title, pageCount, initialPage: 1 },
  _meta: {
    viewUUID: randomUUID(),
  },
};
```

**Client-side**: Receive the UUID in {@link app!App.ontoolresult `ontoolresult`} and use it as the storage key:

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#persistData"
// In your tool callback, include viewUUID in the result metadata.
return {
  content: [{ type: "text", text: `Displaying PDF viewer for "${title}"` }],
  structuredContent: { url, title, pageCount, initialPage: 1 },
  _meta: {
    viewUUID: randomUUID(),
  },
};
```

_See [`examples/map-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server) for a full implementation of this pattern._

## Pausing computation-heavy views when out of view

Views with animations, WebGL rendering, or polling can consume significant CPU/GPU even when scrolled out of view. Use [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) to pause expensive operations when the view isn't visible:

<!-- prettier-ignore -->
```tsx source="./patterns.tsx#visibilityBasedPause"
// Use IntersectionObserver to pause when view scrolls out of view
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animation.play();
    } else {
      animation.pause();
    }
  });
});
observer.observe(container);

// Clean up when the host tears down the view
app.onteardown = async () => {
  observer.disconnect();
  animation.pause();
  return {};
};
```

_See [`examples/shadertoy-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/shadertoy-server) for a full implementation of this pattern._

## Lowering perceived latency

Use {@link app!App.ontoolinputpartial `ontoolinputpartial`} to receive streaming tool arguments as they arrive, allowing you to show a loading preview before the complete input is available.

<!-- prettier-ignore -->
```ts source="../src/app.examples.ts#App_ontoolinputpartial_progressiveRendering"
let toolInputs: Record<string, unknown> | null = null;
let toolInputsPartial: Record<string, unknown> | null = null;

app.ontoolinputpartial = (params) => {
  toolInputsPartial = params.arguments as Record<string, unknown>;
  render();
};

app.ontoolinput = (params) => {
  toolInputs = params.arguments as Record<string, unknown>;
  toolInputsPartial = null;
  render();
};

function render() {
  if (toolInputs) {
    renderFinalUI(toolInputs);
  } else {
    renderLoadingUI(toolInputsPartial); // e.g., shimmer with partial preview
  }
}
```

> [!IMPORTANT]
> Partial arguments are "healed" JSON — the host closes unclosed brackets/braces to produce valid JSON. This means objects may be incomplete (e.g., the last item in an array may be truncated). Don't rely on partial data for critical operations; use it only for preview UI.

_See [`examples/threejs-server/`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/threejs-server) for a full implementation of this pattern._
