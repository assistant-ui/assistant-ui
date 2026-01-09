"use client";

import { ToolUIErrorBoundary, type ToolUIErrorBoundaryProps } from "../shared";

export function CodeBlockErrorBoundary(
  props: Omit<ToolUIErrorBoundaryProps, "componentName">,
) {
  const { children, ...rest } = props;
  return (
    <ToolUIErrorBoundary componentName="CodeBlock" {...rest}>
      {children}
    </ToolUIErrorBoundary>
  );
}
