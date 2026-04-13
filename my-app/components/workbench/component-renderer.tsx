"use client";

import { useMemo, type ReactNode } from "react";
import {
  useIsTransitioning,
  useSelectedComponent,
  useToolInput,
} from "@/lib/workbench/store";
import { getComponent } from "@/lib/workbench/component-registry";
import { OpenAIProvider } from "@/lib/workbench/openai-context";
import { cn } from "@/lib/ui/cn";
import {
  VIEW_TRANSITION_NAME,
  VIEW_TRANSITION_PARENT_NAME,
} from "@/lib/workbench/transition-config";
import { ComponentErrorBoundary } from "./component-error-boundary";
import { IsolatedThemeWrapper } from "./isolated-theme-wrapper";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function FallbackComponent({ componentId }: { componentId: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="font-medium text-destructive text-sm">
          Component not found
        </div>
        <div className="mt-1 text-muted-foreground text-xs">
          &ldquo;{componentId}&rdquo; is not in the registry
        </div>
      </div>
    </div>
  );
}

function ComponentRenderer() {
  const selectedComponent = useSelectedComponent();
  const toolInput = useToolInput();

  const entry = useMemo(
    () => getComponent(selectedComponent),
    [selectedComponent],
  );

  const props = useMemo(
    () => ({
      ...(entry?.defaultProps ?? {}),
      ...toolInput,
    }),
    [entry?.defaultProps, toolInput],
  );

  if (!entry) {
    return <FallbackComponent componentId={selectedComponent} />;
  }

  const Component = entry.component;
  return <Component {...props} />;
}

export function ComponentContent({ className }: { className?: string }) {
  const toolInput = useToolInput();

  return (
    <IsolatedThemeWrapper className={cn("flex", className)}>
      <OpenAIProvider>
        <ComponentErrorBoundary toolInput={toolInput}>
          <div className="h-full w-full">
            <ComponentRenderer />
          </div>
        </ComponentErrorBoundary>
      </OpenAIProvider>
    </IsolatedThemeWrapper>
  );
}

export function MorphContainer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isTransitioning = useIsTransitioning();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        className,
        !prefersReducedMotion && "transition-all duration-300 ease-out",
      )}
      style={
        {
          ...style,
          viewTransitionName: isTransitioning
            ? VIEW_TRANSITION_NAME
            : undefined,
          viewTransitionGroup: isTransitioning
            ? VIEW_TRANSITION_PARENT_NAME
            : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
