"use client";

import { useSelectedComponent } from "@/lib/workbench/store";
import { WidgetIframeHost, useWidgetBundle } from "@/lib/workbench/iframe";
import { cn } from "@/lib/ui/cn";
import { IsolatedThemeWrapper } from "./isolated-theme-wrapper";

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="text-muted-foreground text-sm">Bundling widget...</div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="font-medium text-destructive text-sm">Bundle Error</div>
        <div className="mt-1 max-w-md text-muted-foreground text-xs">
          {error}
        </div>
      </div>
    </div>
  );
}

function IframeComponentRenderer() {
  const selectedComponent = useSelectedComponent();
  const { loading, error, bundle } = useWidgetBundle(selectedComponent);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return <WidgetIframeHost widgetBundle={bundle} className="h-full w-full" />;
}

export function IframeComponentContent({ className }: { className?: string }) {
  return (
    <IsolatedThemeWrapper className={cn("flex", className)}>
      <div className="h-full w-full">
        <IframeComponentRenderer />
      </div>
    </IsolatedThemeWrapper>
  );
}
