import type { ComponentProps } from "react";
import { cn } from "../site/utils";
import { CopyAnchorButton } from "./copy-button";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Heading({
  as: As = "h1",
  className,
  children,
  ...props
}: ComponentProps<"h1"> & { as?: HeadingTag }) {
  if (!props.id) {
    return (
      <As {...props} className={className}>
        {children}
      </As>
    );
  }

  return (
    <As {...props} className={cn("aui-docs-heading", className)}>
      <a data-card="" href={`#${props.id}`}>
        {children}
      </a>
      <CopyAnchorButton id={props.id} />
    </As>
  );
}
