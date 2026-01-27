import type { Element } from "hast";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";
import type { Options as RemarkRehypeOptions } from "remark-rehype";
import type {
  StreamdownProps,
  MermaidOptions,
  MermaidErrorComponentProps,
} from "streamdown";

/**
 * Caret style for streaming indicator.
 */
export type CaretStyle = "block" | "circle";

/**
 * Controls configuration for interactive elements.
 */
export type ControlsConfig =
  | boolean
  | {
      table?: boolean;
      code?: boolean;
      mermaid?:
        | boolean
        | {
            download?: boolean;
            copy?: boolean;
            fullscreen?: boolean;
            panZoom?: boolean;
          };
    };

/**
 * Props passed to the link safety modal component.
 */
export type LinkSafetyModalProps = {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Configuration for link safety confirmation.
 */
export type LinkSafetyConfig = {
  /** Whether link safety is enabled. */
  enabled: boolean;
  /** Custom function to check if a link is safe. */
  onLinkCheck?: (url: string) => Promise<boolean> | boolean;
  /** Custom modal component for link confirmation. */
  renderModal?: (props: LinkSafetyModalProps) => ReactNode;
};

/**
 * Custom handler for incomplete markdown completion.
 */
export type RemendHandler = {
  /** Handler name for identification */
  name: string;
  /** Function to transform text */
  handle: (text: string) => string;
  /** Priority for handler execution order (lower runs first, default: 100) */
  priority?: number;
};

/**
 * Configuration for incomplete markdown auto-completion.
 */
export type RemendConfig = {
  /** Complete links (e.g., `[text](url` → `[text](streamdown:incomplete-link)`) */
  links?: boolean;
  /** Complete images (e.g., `![alt](url` → removed) */
  images?: boolean;
  /** How to handle incomplete links: 'protocol' or 'text-only' */
  linkMode?: "protocol" | "text-only";
  /** Complete bold formatting (e.g., `**text` → `**text**`) */
  bold?: boolean;
  /** Complete italic formatting (e.g., `*text` → `*text*`) */
  italic?: boolean;
  /** Complete bold-italic formatting (e.g., `***text` → `***text***`) */
  boldItalic?: boolean;
  /** Complete inline code formatting (e.g., `` `code `` → `` `code` ``) */
  inlineCode?: boolean;
  /** Complete strikethrough formatting (e.g., `~~text` → `~~text~~`) */
  strikethrough?: boolean;
  /** Complete block KaTeX math (e.g., `$$equation` → `$$equation$$`) */
  katex?: boolean;
  /** Handle incomplete setext headings to prevent misinterpretation */
  setextHeadings?: boolean;
  /** Custom handlers for incomplete markdown completion */
  handlers?: RemendHandler[];
};

/**
 * Props for the SyntaxHighlighter component.
 * Compatible with @assistant-ui/react-markdown API.
 */
export type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: ComponentType<
      ComponentPropsWithoutRef<"pre"> & { node?: Element | undefined }
    >;
    Code: ComponentType<
      ComponentPropsWithoutRef<"code"> & { node?: Element | undefined }
    >;
  };
  language: string;
  code: string;
};

/**
 * Props for the CodeHeader component.
 * Compatible with @assistant-ui/react-markdown API.
 */
export type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

/**
 * Language-specific component overrides.
 */
export type ComponentsByLanguage = Record<
  string,
  {
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  }
>;

/**
 * Extended components prop that includes SyntaxHighlighter and CodeHeader.
 */
export type StreamdownTextComponents = NonNullable<
  StreamdownProps["components"]
> & {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
};

/**
 * Plugin configuration type.
 * Set to `false` to explicitly disable a plugin.
 * Set to a plugin instance to use that plugin.
 *
 * NOTE: Plugins are NOT auto-detected for tree-shaking optimization.
 * You must explicitly import and provide them.
 *
 * @example
 * import { code } from "@streamdown/code";
 * import { math } from "@streamdown/math";
 * <StreamdownTextPrimitive plugins={{ code, math }} />
 */
export type PluginConfig = {
  /** Code syntax highlighting plugin. Must be explicitly provided. */
  code?: unknown | false | undefined;
  /** Math/LaTeX rendering plugin. Must be explicitly provided. */
  math?: unknown | false | undefined;
  /** CJK text optimization plugin. Must be explicitly provided. */
  cjk?: unknown | false | undefined;
  /** Mermaid diagram plugin. Must be explicitly provided. */
  mermaid?: unknown | false | undefined;
};

/**
 * Resolved plugin configuration (without false values).
 * This is the type passed to streamdown after processing.
 */
export type ResolvedPluginConfig = NonNullable<StreamdownProps["plugins"]>;

/**
 * Allowed HTML tags whitelist.
 * Maps tag names to allowed attribute names.
 */
export type AllowedTags = Record<string, string[]>;

/**
 * Security configuration for URL validation via rehype-harden.
 * Overrides streamdown's permissive defaults (allow-all policy).
 *
 * @example
 * // Restrict to specific domains
 * security={{
 *   allowedLinkPrefixes: ["https://example.com", "https://docs.example.com"],
 *   allowedImagePrefixes: ["https://cdn.example.com"],
 *   allowedProtocols: ["https", "mailto"],
 * }}
 */
export type SecurityConfig = {
  /** URL prefixes allowed for links. Default: ["*"] (all) */
  allowedLinkPrefixes?: string[];
  /** URL prefixes allowed for images. Default: ["*"] (all) */
  allowedImagePrefixes?: string[];
  /** Allowed protocols (e.g., ["http", "https", "mailto"]). Default: ["*"] */
  allowedProtocols?: string[];
  /** Allow base64 data images. Default: true */
  allowDataImages?: boolean;
  /** Default origin for relative URLs */
  defaultOrigin?: string;
  /** CSS class for blocked links */
  blockedLinkClass?: string;
  /** CSS class for blocked images */
  blockedImageClass?: string;
};

export type { MermaidOptions, MermaidErrorComponentProps, RemarkRehypeOptions };

/**
 * Props for the BlockComponent override.
 * Used to customize how individual markdown blocks are rendered.
 *
 * Note: This is a documentation type. The actual BlockComponent prop
 * uses StreamdownProps["BlockComponent"] for type compatibility.
 */
export type BlockProps = {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
  index: number;
  components?: StreamdownProps["components"];
  rehypePlugins?: StreamdownProps["rehypePlugins"];
  remarkPlugins?: StreamdownProps["remarkPlugins"];
  remarkRehypeOptions?: RemarkRehypeOptions;
};

/**
 * Props for StreamdownTextPrimitive.
 */
export type StreamdownTextPrimitiveProps = Omit<
  StreamdownProps,
  | "children"
  | "components"
  | "plugins"
  | "caret"
  | "controls"
  | "linkSafety"
  | "remend"
  | "mermaid"
  | "BlockComponent"
  | "parseMarkdownIntoBlocksFn"
> & {
  /**
   * Custom components for rendering markdown elements.
   * Includes SyntaxHighlighter and CodeHeader for code block customization.
   */
  components?: StreamdownTextComponents | undefined;

  /**
   * Language-specific component overrides.
   * @example { mermaid: { SyntaxHighlighter: MermaidDiagram } }
   */
  componentsByLanguage?: ComponentsByLanguage | undefined;

  /**
   * Plugin configuration.
   * Set to `false` to disable a specific plugin when using merged configs.
   *
   * @example
   * // With plugins
   * import { code } from "@streamdown/code";
   * import { math } from "@streamdown/math";
   * plugins={{ code, math }}
   *
   * @example
   * // Disable a plugin in merged config
   * plugins={{ code: false }}
   */
  plugins?: PluginConfig | undefined;

  /**
   * Function to transform text before markdown processing.
   */
  preprocess?: ((text: string) => string) | undefined;

  /**
   * Container element props.
   */
  containerProps?:
    | Omit<ComponentPropsWithoutRef<"div">, "children">
    | undefined;

  /**
   * Additional class name for the container.
   */
  containerClassName?: string | undefined;

  /**
   * Streaming caret style.
   * - "block": Block cursor (▋)
   * - "circle": Circle cursor (●)
   */
  caret?: CaretStyle | undefined;

  /**
   * Interactive controls configuration.
   * Set to `true` to enable all controls, `false` to disable all,
   * or provide an object to configure specific controls.
   *
   * @example
   * // Enable all controls
   * controls={true}
   *
   * @example
   * // Configure specific controls
   * controls={{ code: true, table: false, mermaid: { fullscreen: true } }}
   */
  controls?: ControlsConfig | undefined;

  /**
   * Link safety configuration.
   * Shows a confirmation dialog before opening external links.
   *
   * @example
   * // Disable link safety
   * linkSafety={{ enabled: false }}
   *
   * @example
   * // Custom link check
   * linkSafety={{
   *   enabled: true,
   *   onLinkCheck: (url) => url.startsWith('https://trusted.com')
   * }}
   */
  linkSafety?: LinkSafetyConfig | undefined;

  /**
   * Incomplete markdown auto-completion configuration.
   * Controls how streaming markdown with incomplete syntax is handled.
   *
   * @example
   * // Disable link completion
   * remend={{ links: false }}
   *
   * @example
   * // Use text-only mode for incomplete links
   * remend={{ linkMode: "text-only" }}
   */
  remend?: RemendConfig | undefined;

  /**
   * Mermaid diagram configuration.
   * Allows customization of Mermaid rendering.
   *
   * @example
   * // Custom Mermaid config
   * mermaid={{ config: { theme: 'dark' } }}
   *
   * @example
   * // Custom error component
   * mermaid={{ errorComponent: MyMermaidError }}
   */
  mermaid?: MermaidOptions | undefined;

  /**
   * Whether to parse incomplete markdown during streaming.
   * When true, incomplete markdown syntax will be processed as-is.
   * When false (default), remend will complete the syntax first.
   */
  parseIncompleteMarkdown?: boolean | undefined;

  /**
   * Allowed HTML tags whitelist.
   * Maps tag names to their allowed attribute names.
   * Use this to allow specific HTML tags in markdown content.
   *
   * @example
   * allowedTags={{ div: ['class', 'id'], span: ['class'] }}
   */
  allowedTags?: AllowedTags | undefined;

  /**
   * Options passed to remark-rehype during markdown processing.
   * Allows customization of the remark to rehype conversion.
   *
   * @example
   * remarkRehypeOptions={{ allowDangerousHtml: true }}
   */
  remarkRehypeOptions?: RemarkRehypeOptions | undefined;

  /**
   * Security configuration for URL/image validation.
   * Overrides streamdown's default (allow-all) policy via rehype-harden.
   *
   * @example
   * // Restrict links to trusted domains only
   * security={{
   *   allowedLinkPrefixes: ["https://trusted.com"],
   *   allowedImagePrefixes: ["https://cdn.trusted.com"],
   *   allowedProtocols: ["https"],
   * }}
   */
  security?: SecurityConfig | undefined;

  /**
   * Custom component for rendering individual markdown blocks.
   * Use this for advanced block-level customization.
   *
   * @example
   * BlockComponent={({ content, index }) => <div key={index}>{content}</div>}
   */
  BlockComponent?: StreamdownProps["BlockComponent"] | undefined;

  /**
   * Custom function to parse markdown into blocks.
   * By default, streamdown splits on double newlines.
   * Use this to implement custom block splitting logic.
   *
   * @example
   * parseMarkdownIntoBlocksFn={(md) => md.split(/\n{2,}/)}
   */
  parseMarkdownIntoBlocksFn?: ((markdown: string) => string[]) | undefined;
};

export type { StreamdownProps };
