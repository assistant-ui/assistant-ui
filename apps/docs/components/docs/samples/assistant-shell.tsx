"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantShell,
  AssistantShellFooterItem,
} from "@/components/assistant-ui/assistant-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  ChartColumnIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";

const menuItemClass = "gap-2 px-2 py-1.5";

const AccountMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <AssistantShellFooterItem
            icon={
              <Avatar>
                <AvatarFallback className="bg-linear-to-br from-sky-400 to-indigo-500" />
              </Avatar>
            }
            label="Alex Johnson"
            description="Personal account"
            trailing={<ChevronsUpDownIcon className="size-4" />}
          />
        }
      />
      <DropdownMenuContent
        side="top"
        align="start"
        className="ring-border dark:ring-muted min-w-56 p-1.5 shadow-none"
      >
        <DropdownMenuItem className={menuItemClass}>
          <SparklesIcon /> Upgrade plan
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItemClass}>
          <ChartColumnIcon /> Usage
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItemClass}>
          <SettingsIcon /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={menuItemClass}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function AssistantShellSample() {
  return (
    <SampleFrame className="h-100 overflow-hidden md:h-150">
      <AssistantShell
        className="h-full"
        sidebarFooter={<AccountMenu />}
        headerActions={
          <Button variant="ghost">
            <Share2Icon /> Share
          </Button>
        }
      >
        <Thread />
      </AssistantShell>
    </SampleFrame>
  );
}
