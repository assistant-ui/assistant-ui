"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../site/utils";
import type { PreProps } from "./code-block";
import { CopyButton } from "./copy-button";

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
        <CopyButton />
      </div>
      <div
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
