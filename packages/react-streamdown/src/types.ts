import type { Element } from "hast";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import type { StreamdownProps } from "streamdown";

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
 * Omit or set to `undefined` to use auto-detection for code/math/cjk.
 */
export type PluginConfig = {
  /** Code syntax highlighting plugin. Auto-detected if @streamdown/code is installed. */
  code?: unknown | false | undefined;
  /** Math/LaTeX rendering plugin. Auto-detected if @streamdown/math is installed. */
  math?: unknown | false | undefined;
  /** CJK text optimization plugin. Auto-detected if @streamdown/cjk is installed. */
  cjk?: unknown | false | undefined;
  /** Mermaid diagram plugin. Must be explicitly provided (not auto-detected). */
  mermaid?: unknown | false | undefined;
};

/**
 * Resolved plugin configuration (without false values).
 */
export type ResolvedPluginConfig = {
  code?: unknown;
  math?: unknown;
  cjk?: unknown;
  mermaid?: unknown;
};

/**
 * Props for StreamdownTextPrimitive.
 */
export type StreamdownTextPrimitiveProps = Omit<
  StreamdownProps,
  "children" | "components" | "plugins"
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
};

export type { StreamdownProps };
