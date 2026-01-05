# Workbench SDK

React hooks for building ChatGPT App widgets. These hooks provide access to the OpenAI Apps SDK, which is simulated locally in the workbench and works in production when deployed to ChatGPT.

## Quick Start

```tsx
import {
  useToolInput,
  useTheme,
  useCallTool,
  useWidgetState,
} from "@/lib/workbench";

function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const theme = useTheme();
  const callTool = useCallTool();
  const [state, setState] = useWidgetState({ count: 0 });

  const handleSearch = async () => {
    const result = await callTool("search", { query: input.query });
    console.log(result.structuredContent);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <p>Query: {input.query}</p>
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

---

## Hooks Reference

### Reading State

#### `useToolInput<T>()`

Returns the input passed to your widget from the MCP tool call.

```tsx
const input = useToolInput<{ city: string; units?: "metric" | "imperial" }>();
// input.city, input.units
```

#### `useToolOutput<T>()`

Returns the most recent tool call response, or `null` if no tool has been called.

```tsx
const output = useToolOutput<{ temperature: number; conditions: string }>();
// output?.temperature, output?.conditions
```

#### `useTheme()`

Returns the current theme: `"light"` or `"dark"`.

```tsx
const theme = useTheme();
// Apply conditional styling based on theme
```

#### `useDisplayMode()`

Returns the current display mode: `"inline"`, `"pip"`, or `"fullscreen"`.

```tsx
const displayMode = useDisplayMode();
const isFullscreen = displayMode === "fullscreen";
```

#### `usePreviousDisplayMode()`

Returns the previous display mode (useful for transition animations), or `null`.

```tsx
const previousMode = usePreviousDisplayMode();
const expandedFromInline = previousMode === "inline";
```

#### `useLocale()`

Returns the user's locale string (e.g., `"en-US"`).

```tsx
const locale = useLocale();
const formatted = new Intl.NumberFormat(locale).format(1234.56);
```

#### `useWidgetState<T>(defaultState?)`

Returns a tuple `[state, setState]` for persistent widget state that survives across tool calls.

```tsx
const [state, setState] = useWidgetState({ selectedId: null, favorites: [] });

// Update state
setState({ ...state, selectedId: "abc" });

// Or use updater function
setState((prev) => ({ ...prev, selectedId: "abc" }));
```

#### `useView()`

Returns the current view configuration, or `null`. Used for modal overlays.

```tsx
const view = useView();
if (view?.mode === "modal") {
  return <ModalContent params={view.params} />;
}
```

---

### Calling Methods

#### `useCallTool()`

Returns a function to call MCP tools. Returns a `Promise<CallToolResponse>`.

```tsx
const callTool = useCallTool();

const handleRefresh = async () => {
  const result = await callTool("refresh_data", { id: "123" });

  if (result.isError) {
    console.error(result.content);
    return;
  }

  console.log(result.structuredContent);
};
```

**CallToolResponse shape:**

```ts
interface CallToolResponse {
  structuredContent?: Record<string, unknown>; // Success data
  content?: string; // Error message
  isError?: boolean; // True if error
  _meta?: Record<string, unknown>; // Metadata
}
```

#### `useRequestDisplayMode()`

Returns a function to request a display mode change.

```tsx
const requestDisplayMode = useRequestDisplayMode();

const handleExpand = () => requestDisplayMode({ mode: "fullscreen" });
const handleCollapse = () => requestDisplayMode({ mode: "inline" });
```

#### `useSendFollowUpMessage()`

Returns a function to send a message to ChatGPT on behalf of the user.

```tsx
const sendFollowUpMessage = useSendFollowUpMessage();

const handleAskMore = () => {
  sendFollowUpMessage({ prompt: "Tell me more about this location" });
};
```

#### `useOpenExternal()`

Returns a function to open a URL in a new browser tab.

```tsx
const openExternal = useOpenExternal();

const handleOpenWebsite = (url: string) => {
  openExternal({ href: url });
};
```

#### `useUploadFile()`

Returns a function to upload a file. Returns `{ fileId: string }`.

```tsx
const uploadFile = useUploadFile();

const handleUpload = async (file: File) => {
  const { fileId } = await uploadFile(file);
  console.log("Uploaded:", fileId);
};
```

#### `useGetFileDownloadUrl()`

Returns a function to get a download URL for an uploaded file.

```tsx
const getFileDownloadUrl = useGetFileDownloadUrl();

const handleDownload = async (fileId: string) => {
  const { downloadUrl } = await getFileDownloadUrl({ fileId });
  window.open(downloadUrl);
};
```

---

## Common Patterns

### Loading State When Calling Tools

```tsx
function SearchWidget() {
  const callTool = useCallTool();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await callTool("search", { query });
      setResults(response.structuredContent);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Spinner />;
  return <ResultsList results={results} />;
}
```

### Handling Tool Errors

```tsx
const handleAction = async () => {
  const result = await callTool("risky_action", { id });

  if (result.isError) {
    // result.content contains the error message
    showError(result.content);
    return;
  }

  // Success - use result.structuredContent
  processData(result.structuredContent);
};
```

### Display Mode Transitions

```tsx
function ExpandableWidget() {
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();

  return (
    <div className={displayMode === "fullscreen" ? "h-screen" : "h-64"}>
      <button
        onClick={() =>
          requestDisplayMode({
            mode: displayMode === "fullscreen" ? "inline" : "fullscreen",
          })
        }
      >
        {displayMode === "fullscreen" ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}
```

### Persisting User Preferences

```tsx
interface WidgetPrefs {
  sortOrder: "asc" | "desc";
  showDetails: boolean;
}

function PreferencesWidget() {
  const [prefs, setPrefs] = useWidgetState<WidgetPrefs>({
    sortOrder: "asc",
    showDetails: false,
  });

  const toggleDetails = () => {
    setPrefs((prev) => ({ ...prev, showDetails: !prev?.showDetails }));
  };

  return (
    <button onClick={toggleDetails}>
      {prefs?.showDetails ? "Hide" : "Show"} Details
    </button>
  );
}
```

### Responding to Theme Changes

```tsx
function ThemedWidget() {
  const theme = useTheme();

  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
      )}
    >
      Content adapts to theme
    </div>
  );
}
```

---

## Full Examples

See complete widget implementations:

- **POI Map** - `components/examples/poi-map/` + `lib/workbench/wrappers/poi-map-sdk.tsx`
- **Welcome Card** - `components/examples/welcome-card/` + `lib/workbench/wrappers/welcome-card-sdk.tsx`

---

## Workbench Features

### Display Modes

The workbench toolbar lets you preview your widget in different display modes:

| Mode | Description |
| --- | --- |
| **Inline** | Widget appears embedded in the conversation flow (default) |
| **PiP** | Widget floats above the conversation as a picture-in-picture overlay |
| **Fullscreen** | Widget takes over the entire viewport |

Use these modes to test how your widget adapts to different contexts. Your widget can read the current mode via `useDisplayMode()` and request changes via `useRequestDisplayMode()`.

### Device Types

Test responsive layouts by switching between device presets:

- **Desktop** — Full width (770px max)
- **Tablet** — Tablet viewport
- **Mobile** — Mobile viewport
- **Resizable** — Drag to resize freely

### Conversation Mode

Conversation Mode (chat bubble icon, inline mode only) shows your widget in a simulated ChatGPT conversation context:

```
┌─────────────────────────────────────┐
│  User: "Show me coffee shops nearby" │  ← User message
├─────────────────────────────────────┤
│  🔄 Using poi_search...              │  ← Tool indicator
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │     [Your Widget]               ││  ← Widget preview
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Assistant: "Here are some nearby..."│  ← Response
└─────────────────────────────────────┘
```

This helps visualize the full flow: user prompt → tool call → widget render → assistant response.

**Customizing conversation messages:**

Add a `conversation` field to your mock variant in `lib/workbench/mock-config/`:

```ts
{
  id: "coffee-search",
  name: "Coffee Search",
  toolInput: { query: "coffee shops", location: "San Francisco" },
  conversation: {
    userMessage: "Find coffee shops near me",
    assistantResponse: "I found several great coffee shops nearby. Tap any location for details!"
  }
}
```

---

## Keyboard Shortcuts (Workbench Only)

| Shortcut               | Action            |
| ---------------------- | ----------------- |
| `Cmd/Ctrl + Shift + D` | Toggle theme      |
| `Cmd/Ctrl + Shift + F` | Toggle fullscreen |
| `Cmd/Ctrl + K`         | Clear console     |
