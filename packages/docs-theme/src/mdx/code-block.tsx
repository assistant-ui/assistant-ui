"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "../site/utils";

function CopyButton({
  getText,
  label = "Copy code",
  floating,
}: {
  getText: () => string;
  label?: string;
  floating?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      clearTimeout(copyTimer.current);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      data-floating={floating ? "" : undefined}
      className="aui-docs-codeblock-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
        } catch {
          return;
        }
        // The write can settle after the button is gone, and a confirmation
        // started then would outlive the cleanup that was meant to cancel it.
        if (unmounted.current) return;
        setCopied(true);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const getText = () =>
    copyText ?? viewportRef.current?.querySelector("pre")?.textContent ?? "";

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
          <CopyButton getText={getText} />
        </figcaption>
      ) : (
        <CopyButton getText={getText} floating />
      )}
      <div
        ref={viewportRef}
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

type PreProps = ComponentProps<"pre"> & {
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

type CodeGroupItemProps = PreProps & {
  filename?: string;
  label?: string;
  value?: string;
};

function labelOf(props: CodeGroupItemProps, index: number) {
  for (const label of [props.title, props.filename, props.label, props.value])
    if (typeof label === "string" && label.trim()) return label.trim();
  return `Code ${index + 1}`;
}

function codeGroupItems(
  children: ReactNode,
): ReactElement<CodeGroupItemProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === Fragment) return codeGroupItems(child.props.children);
    return [child as ReactElement<CodeGroupItemProps>];
  });
}

/** Code blocks shown one at a time behind a row of title tabs. */
export function CodeGroup({
  className,
  children,
  ...props
}: Omit<ComponentProps<"figure">, "title">) {
  const items = codeGroupItems(children);
  const labels = items.map((item, index) => labelOf(item.props, index));
  const [active, setActive] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = items[active] ?? items[0];
  if (!selected) return null;

  const {
    title: _title,
    filename: _filename,
    label: _label,
    value: _value,
    icon: _icon,
    style,
    ...preProps
  } = selected.props;
  const { backgroundColor: _backgroundColor, ...preStyle } = (style ??
    {}) as CSSProperties;

  return (
    <figure
      {...props}
      className={cn(
        "aui-docs-codeblock not-prose not-fumadocs-codeblock",
        className,
      )}
    >
      <div className="aui-docs-codeblock-header" data-tabs="">
        <div
          role="tablist"
          aria-label="Code variants"
          className="aui-docs-codeblock-tabs"
        >
          {labels.map((label, index) => (
            <button
              key={`${label}-${index}`}
              id={`${id}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls={`${id}-panel`}
              tabIndex={index === active ? 0 : -1}
              className="aui-docs-codeblock-tab"
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                const step =
                  event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowLeft"
                      ? -1
                      : 0;
                if (!step) return;
                event.preventDefault();
                const next = (index + step + labels.length) % labels.length;
                setActive(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <CopyButton
          getText={() =>
            viewportRef.current?.querySelector("pre")?.textContent ?? ""
          }
        />
      </div>
      <div
        ref={viewportRef}
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
        className="aui-docs-codeblock-viewport"
      >
        <pre {...preProps} style={preStyle} data-line-numbers="" />
      </div>
    </figure>
  );
}
