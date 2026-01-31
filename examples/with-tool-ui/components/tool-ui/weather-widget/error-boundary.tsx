"use client";

import { ToolUIErrorBoundary, type ToolUIErrorBoundaryProps } from "../shared";

export function WeatherWidgetErrorBoundary(
  props: Omit<ToolUIErrorBoundaryProps, "componentName">,
) {
  const { children, ...rest } = props;
  return (
    <ToolUIErrorBoundary componentName="WeatherWidget" {...rest}>
      {children}
    </ToolUIErrorBoundary>
  );
}
