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
 * Props for StreamdownTextPrimitive.
 */
export type StreamdownTextPrimitiveProps = Omit<
  StreamdownProps,
  "children" | "components"
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
