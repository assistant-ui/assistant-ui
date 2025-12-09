"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import icon from "@/public/favicon/icon.svg";
import type { TooltipContentProps } from "@radix-ui/react-tooltip";
import { MenuIcon, PanelLeftIcon, ShareIcon } from "lucide-react";
import Image from "next/image";
import { ComponentPropsWithRef, useState, type FC } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModelPicker } from "./ModelPicker";

type ButtonWithTooltipProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string;
  side?: TooltipContentProps["side"];
};

const ButtonWithTooltip: FC<ButtonWithTooltipProps> = ({
  children,
  tooltip,
  side = "top",
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...rest}>
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

const Logo: FC = () => {
  return (
    <div className="flex items-center gap-2 px-2 font-medium text-sm">
      <Image
        src={icon}
        alt="logo"
        className="size-5 dark:hue-rotate-180 dark:invert"
      />
      <span className="text-foreground/90">assistant-ui</span>
    </div>
  );
};

const Sidebar: FC<{ collapsed?: boolean }> = ({ collapsed }) => {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-muted/30 transition-all duration-200",
        collapsed ? "w-0 overflow-hidden opacity-0" : "w-[260px] opacity-100",
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ThreadList />
      </div>
    </aside>
  );
};

const MobileSidebar: FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 md:hidden"
        >
          <MenuIcon className="size-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex h-14 items-center px-4">
          <Logo />
        </div>
        <div className="p-3">
          <ThreadList />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Header: FC<{
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}> = ({ sidebarCollapsed, onToggleSidebar }) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4">
      <MobileSidebar />
      <ButtonWithTooltip
        variant="ghost"
        size="icon"
        tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        side="bottom"
        onClick={onToggleSidebar}
        className="hidden size-9 md:flex"
      >
        <PanelLeftIcon className="size-4" />
      </ButtonWithTooltip>
      <ModelPicker />
      <ButtonWithTooltip
        variant="ghost"
        size="icon"
        tooltip="Share"
        side="bottom"
        className="ml-auto size-9"
      >
        <ShareIcon className="size-4" />
      </ButtonWithTooltip>
    </header>
  );
};

export const Shadcn: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full bg-background [--primary-foreground:0_0%_98%] [--primary:0_0%_9%] dark:[--primary-foreground:0_0%_9%] dark:[--primary:0_0%_98%]">
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-hidden">
          <Thread />
        </main>
      </div>
    </div>
  );
};
