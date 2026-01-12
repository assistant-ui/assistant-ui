"use client";

import * as React from "react";
import { WorkbenchLayout } from "./workbench-layout";
import { LogoMark } from "@/components/ui/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSelectedComponent,
  useWorkbenchStore,
  useDisplayMode,
  useIsLeftPanelOpen,
  useIsRightPanelOpen,
  useIsSDKGuideOpen,
} from "@/lib/workbench/store";
import { useWorkbenchPersistence } from "@/lib/workbench/persistence";
import { workbenchComponents } from "@/lib/workbench/component-registry";
import { SELECT_CLASSES, COMPACT_SMALL_TEXT_CLASSES } from "./styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles } from "lucide-react";
import { OnboardingModal } from "./onboarding-modal";
import { LeftPanelIcon, RightPanelIcon } from "./panel-toggle-icons";
import { SDKGuideModal } from "./sdk-guide/sdk-guide-modal";
import { ExportPopover } from "./export-popover";

export function WorkbenchShell() {
  const [mounted, setMounted] = React.useState(false);
  const selectedComponent = useSelectedComponent();
  const setSelectedComponent = useWorkbenchStore((s) => s.setSelectedComponent);
  const setDisplayMode = useWorkbenchStore((s) => s.setDisplayMode);
  const setLeftPanelOpen = useWorkbenchStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useWorkbenchStore((s) => s.setRightPanelOpen);
  const displayMode = useDisplayMode();
  const isLeftPanelOpen = useIsLeftPanelOpen();
  const isRightPanelOpen = useIsRightPanelOpen();
  const isSDKGuideOpen = useIsSDKGuideOpen();
  const setSDKGuideOpen = useWorkbenchStore((s) => s.setSDKGuideOpen);
  const { setTheme, resolvedTheme } = useTheme();

  useWorkbenchPersistence();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = React.useCallback(() => {
    if (!document.startViewTransition) {
      setTheme(isDark ? "light" : "dark");
      return;
    }
    document.startViewTransition(() => {
      setTheme(isDark ? "light" : "dark");
    });
  }, [isDark, setTheme]);

  const toggleFullscreen = React.useCallback(() => {
    setDisplayMode(displayMode === "fullscreen" ? "inline" : "fullscreen");
  }, [displayMode, setDisplayMode]);

  const toggleSDKGuide = React.useCallback(() => {
    setSDKGuideOpen(!isSDKGuideOpen);
  }, [isSDKGuideOpen, setSDKGuideOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /mac/i.test(navigator.userAgent);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleTheme();
      }

      if (modKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }

      if (modKey && e.key === "/") {
        e.preventDefault();
        toggleSDKGuide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme, toggleFullscreen, toggleSDKGuide]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <LogoMark className="size-5 shrink-0" />
          <span className="select-none font-mono">Workbench</span>
        </div>

        <Select value={selectedComponent} onValueChange={setSelectedComponent}>
          <SelectTrigger className={`${SELECT_CLASSES} font-medium text-sm`}>
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent>
            {workbenchComponents.map((comp) => (
              <SelectItem
                className={`${COMPACT_SMALL_TEXT_CLASSES} text-sm`}
                key={comp.id}
                value={comp.id}
              >
                {comp.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle left panel"
            aria-pressed={isLeftPanelOpen}
            className="size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setLeftPanelOpen(!isLeftPanelOpen)}
          >
            <LeftPanelIcon active={isLeftPanelOpen} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle simulation panel"
            aria-pressed={isRightPanelOpen}
            className="size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setRightPanelOpen(!isRightPanelOpen)}
          >
            <RightPanelIcon active={isRightPanelOpen} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            aria-pressed={isDark}
            className="relative size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={toggleTheme}
          >
            <Sun
              className={cn(
                "size-4 transition-all",
                isDark ? "rotate-90 scale-0" : "rotate-0 scale-100",
              )}
            />
            <Moon
              className={cn(
                "absolute size-4 transition-all",
                isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0",
              )}
            />
          </Button>

          <div className="mx-2 h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            aria-label="SDK Guide (⌘/)"
            className="size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={toggleSDKGuide}
          >
            <Sparkles className="size-4" />
          </Button>

          <ExportPopover />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkbenchLayout />
      </div>
      <OnboardingModal />
      <SDKGuideModal />
    </div>
  );
}
