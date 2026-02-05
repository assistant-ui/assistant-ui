/**
 * Color theme of the host application.
 * Use `useTheme()` hook to get the current theme and adapt your UI accordingly.
 *
 * @example
 * ```tsx
 * const theme = useTheme();
 * return <div className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>...</div>
 * ```
 */
export type Theme = "light" | "dark";

/**
 * Platform your app is running on.
 * - `"mcp"` - Running inside an MCP Apps host (including ChatGPT)
 * - `"unknown"` - Platform not detected (development mode or unsupported host)
 *
 * Use `usePlatform()` hook or `detectPlatform()` to check at runtime.
 *
 * @example
 * ```tsx
 * const platform = usePlatform();
 * if (platform === 'unknown') return null;
 * ```
 */
export type Platform = "mcp" | "unknown";

/**
 * Display mode for the widget.
 * - `"inline"` - Widget embedded in conversation flow (default)
 * - `"fullscreen"` - Widget takes full screen
 * - `"pip"` - Picture-in-picture floating window (ChatGPT only)
 *
 * Use `useDisplayMode()` to get current mode and request changes.
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useDisplayMode();
 * <button onClick={() => setMode('fullscreen')}>Expand</button>
 * ```
 */
export type DisplayMode = "inline" | "fullscreen" | "pip";

/**
 * Annotations for content blocks that provide hints to the host.
 */
export interface ContentBlockAnnotations {
  /** Who should see this content: user, assistant, or both */
  audience?: Array<"user" | "assistant">;
  /** ISO timestamp of last modification */
  lastModified?: string;
  /** Priority hint for content ordering (higher = more important) */
  priority?: number;
}

interface ContentBlockBase {
  /** Arbitrary metadata passed through to the host */
  _meta?: Record<string, unknown>;
  /** Annotations providing hints about the content */
  annotations?: ContentBlockAnnotations;
}

/**
 * Icon definition for resource links.
 */
export interface ContentBlockIcon {
  /** URL or data URI of the icon */
  src: string;
  /** MIME type of the icon (e.g., "image/png") */
  mimeType?: string;
  /** Available sizes (e.g., ["16x16", "32x32"]) */
  sizes?: string[];
  /** Which theme this icon is for */
  theme?: "light" | "dark";
}

/**
 * Text content block for plain text responses.
 *
 * @example
 * ```ts
 * const block: TextContentBlock = { type: "text", text: "Hello, world!" };
 * // Or use the helper:
 * const block = textBlock("Hello, world!");
 * ```
 */
export interface TextContentBlock extends ContentBlockBase {
  type: "text";
  /** The text content */
  text: string;
}

/**
 * Image content block for inline images.
 *
 * @example
 * ```ts
 * const block = imageBlock(base64Data, "image/png");
 * ```
 */
export interface ImageContentBlock extends ContentBlockBase {
  type: "image";
  /** Base64-encoded image data */
  data: string;
  /** MIME type (e.g., "image/png", "image/jpeg") */
  mimeType: string;
}

/**
 * Audio content block for inline audio.
 */
export interface AudioContentBlock extends ContentBlockBase {
  type: "audio";
  /** Base64-encoded audio data */
  data: string;
  /** MIME type (e.g., "audio/mp3", "audio/wav") */
  mimeType: string;
}

/**
 * Resource link content block for clickable links to external resources.
 */
export interface ResourceLinkContentBlock extends ContentBlockBase {
  type: "resource_link";
  /** URI of the resource */
  uri: string;
  /** Display name */
  name: string;
  /** Optional title for tooltip */
  title?: string;
  /** Optional description text */
  description?: string;
  /** MIME type of the linked resource */
  mimeType?: string;
  /** Icons to display with the link */
  icons?: ContentBlockIcon[];
}

/**
 * Embedded resource content block.
 */
export interface ResourceContentBlock extends ContentBlockBase {
  type: "resource";
  resource: {
    /** URI identifying the resource */
    uri: string;
    /** MIME type of the resource */
    mimeType?: string;
  } & ({ text: string; blob?: never } | { blob: string; text?: never });
}

/**
 * Union type for all content block types.
 * Used in tool results and chat messages.
 */
export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | AudioContentBlock
  | ResourceLinkContentBlock
  | ResourceContentBlock;

/**
 * Creates a text content block.
 *
 * @param text - The text content
 * @param annotations - Optional annotations
 * @returns A TextContentBlock object
 *
 * @example
 * ```ts
 * const result: ToolResult = {
 *   content: [textBlock("Operation completed successfully")]
 * };
 * ```
 */
export function textBlock(
  text: string,
  annotations?: ContentBlockAnnotations,
): TextContentBlock {
  const block: TextContentBlock = { type: "text", text };
  if (annotations) block.annotations = annotations;
  return block;
}

/**
 * Creates an image content block.
 *
 * @param data - Base64-encoded image data
 * @param mimeType - MIME type (e.g., "image/png")
 * @param annotations - Optional annotations
 * @returns An ImageContentBlock object
 *
 * @example
 * ```ts
 * const screenshot = await captureScreen();
 * const result: ToolResult = {
 *   content: [imageBlock(screenshot, "image/png")]
 * };
 * ```
 */
export function imageBlock(
  data: string,
  mimeType: string,
  annotations?: ContentBlockAnnotations,
): ImageContentBlock {
  const block: ImageContentBlock = { type: "image", data, mimeType };
  if (annotations) block.annotations = annotations;
  return block;
}

/**
 * Result returned from a tool call.
 * Use with `useCallTool()` hook to call tools and handle responses.
 *
 * @example
 * ```tsx
 * const callTool = useCallTool();
 * const result = await callTool('search', { query: 'restaurants' });
 * if (result.isError) {
 *   console.error('Tool failed:', result.content);
 * }
 * ```
 */
export interface ToolResult {
  /** Content blocks with the result (text, images, etc.) */
  content?: ContentBlock[];
  /** Structured JSON data for programmatic access */
  structuredContent?: Record<string, unknown>;
  /** Whether the tool call resulted in an error */
  isError?: boolean;
  /** Arbitrary metadata from the tool */
  _meta?: Record<string, unknown>;
}

/**
 * Container dimensions provided by the host.
 */
export interface ContainerDimensions {
  /** Current height in pixels */
  height?: number;
  /** Maximum allowed height */
  maxHeight?: number;
  /** Current width in pixels */
  width?: number;
  /** Maximum allowed width */
  maxWidth?: number;
}

/**
 * CSS styling hints from the host.
 */
export interface HostStyles {
  /** CSS custom properties (variables) from the host */
  variables?: Record<string, string>;
  css?: {
    /** Font CSS to inject for consistent typography */
    fonts?: string;
  };
}

/**
 * Context information about the host environment.
 * Access via `useHostContext()` hook.
 *
 * @example
 * ```tsx
 * const context = useHostContext();
 * console.log('Theme:', context?.theme);
 * console.log('Locale:', context?.locale);
 * console.log('Display mode:', context?.displayMode);
 * ```
 */
export interface HostContext {
  /** Current color theme ("light" or "dark") */
  theme?: Theme;
  /** User's locale (e.g., "en-US", "ja-JP") */
  locale?: string;
  /** User's timezone (e.g., "America/New_York") */
  timeZone?: string;
  /** Current display mode */
  displayMode?: DisplayMode;
  /** Display modes the host supports */
  availableDisplayModes?: DisplayMode[];
  /** Container size constraints */
  containerDimensions?: ContainerDimensions;
  /** Host-provided styling hints */
  styles?: HostStyles;
  /** Platform type (web, desktop, mobile) */
  platform?: "web" | "desktop" | "mobile";
  /** Device input capabilities */
  deviceCapabilities?: {
    /** Device has touch input */
    touch?: boolean;
    /** Device has hover capability (mouse) */
    hover?: boolean;
  };
  /** Safe area insets for notched devices */
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** User agent string */
  userAgent?: string;
  /** Information about the tool that invoked this widget */
  toolInfo?: {
    /** Unique identifier for this tool call */
    id?: string | number;
    tool: {
      /** Name of the tool */
      name: string;
      /** Tool description */
      description?: string;
      /** JSON Schema for tool input */
      inputSchema?: Record<string, unknown>;
    };
  };
}

/**
 * Chat message to send to the conversation.
 * Used with `useSendMessage()` hook.
 */
export interface ChatMessage {
  /** Message role (currently only "user" supported) */
  role: "user";
  /** Message content blocks */
  content: ContentBlock[];
}
