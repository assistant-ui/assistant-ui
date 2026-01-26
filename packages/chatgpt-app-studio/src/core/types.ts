export type Theme = "light" | "dark";
export type Platform = "chatgpt" | "mcp" | "unknown";
export type DisplayMode = "inline" | "fullscreen" | "pip";

export interface ContentBlockAnnotations {
  audience?: Array<"user" | "assistant">;
  lastModified?: string;
  priority?: number;
}

interface ContentBlockBase {
  _meta?: Record<string, unknown>;
  annotations?: ContentBlockAnnotations;
}

export interface ContentBlockIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: "light" | "dark";
}

export interface TextContentBlock extends ContentBlockBase {
  type: "text";
  text: string;
}

export interface ImageContentBlock extends ContentBlockBase {
  type: "image";
  data: string;
  mimeType: string;
}

export interface AudioContentBlock extends ContentBlockBase {
  type: "audio";
  data: string;
  mimeType: string;
}

export interface ResourceLinkContentBlock extends ContentBlockBase {
  type: "resource_link";
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: ContentBlockIcon[];
}

export interface ResourceContentBlock extends ContentBlockBase {
  type: "resource";
  resource: {
    uri: string;
    mimeType?: string;
  } & ({ text: string; blob?: never } | { blob: string; text?: never });
}

export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | AudioContentBlock
  | ResourceLinkContentBlock
  | ResourceContentBlock;

export function textBlock(
  text: string,
  annotations?: ContentBlockAnnotations,
): TextContentBlock {
  const block: TextContentBlock = { type: "text", text };
  if (annotations) block.annotations = annotations;
  return block;
}

export function imageBlock(
  data: string,
  mimeType: string,
  annotations?: ContentBlockAnnotations,
): ImageContentBlock {
  const block: ImageContentBlock = { type: "image", data, mimeType };
  if (annotations) block.annotations = annotations;
  return block;
}

export interface ToolResult {
  content?: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

export interface ContainerDimensions {
  height?: number;
  maxHeight?: number;
  width?: number;
  maxWidth?: number;
}

export interface HostStyles {
  variables?: Record<string, string>;
  css?: {
    fonts?: string;
  };
}

export interface HostContext {
  theme?: Theme;
  locale?: string;
  timeZone?: string;
  displayMode?: DisplayMode;
  availableDisplayModes?: DisplayMode[];
  containerDimensions?: ContainerDimensions;
  styles?: HostStyles;
  platform?: "web" | "desktop" | "mobile";
  deviceCapabilities?: {
    touch?: boolean;
    hover?: boolean;
  };
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  userAgent?: string;
  toolInfo?: {
    id?: string | number;
    tool: {
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    };
  };
}

export interface ChatMessage {
  role: "user";
  content: ContentBlock[];
}
