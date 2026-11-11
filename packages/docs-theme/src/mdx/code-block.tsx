import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../site/utils";
import { CopyButton } from "./copy-button";

export interface CodeBlockProps extends Omit<
  ComponentProps<"figure">,
  "title"
> {
  /** Label in the header, usually the file name. */
  title?: ReactNode;
  /** Text for the copy button; defaults to the rendered code's text. */
  copyText?: string;
}

/**
 * Chrome for highlighted code: a hairline panel with an optional title header
 * and a copy button. Children carry the `pre`; `data-line-numbers` on it turns
 * on the line-number gutter.
 */
export function CodeBlock({
  title,
  copyText,
  className,
  children,
  ...props
}: CodeBlockProps) {
  return (
    <figure
      {...props}
      className={cn(
        "aui-docs-codeblock not-prose not-fumadocs-codeblock",
        className,
      )}
    >
      {title ? (
        <figcaption className="aui-docs-codeblock-header">
          <span className="aui-docs-codeblock-title">{title}</span>
          <CopyButton text={copyText} />
        </figcaption>
      ) : (
        <CopyButton text={copyText} floating />
      )}
      <div
        role="region"
        aria-label="Code"
        tabIndex={0}
        className="aui-docs-codeblock-viewport"
      >
        {children}
      </div>
    </figure>
  );
}

export type PreProps = ComponentProps<"pre"> & {
  title?: ReactNode;
  icon?: ReactNode;
};

/** The MDX `pre`: highlighted code in a numbered {@link CodeBlock}. */
export function Pre({ title, icon: _icon, style, ...props }: PreProps) {
  const { backgroundColor: _backgroundColor, ...preStyle } = (style ??
    {}) as CSSProperties;
  return (
    <CodeBlock title={title}>
      <pre {...props} style={preStyle} data-line-numbers="" />
    </CodeBlock>
  );
}
