"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const frameClass =
  "flex h-auto flex-wrap items-center justify-center gap-4 p-10";

export function ButtonSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Button>Read the docs</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
    </SampleFrame>
  );
}

export function DropdownMenuSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              Open menu
              <ChevronDownIcon className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem>
            <UserIcon className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SettingsIcon className="size-4" />
            Settings
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOutIcon className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SampleFrame>
  );
}

export function InputSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-64 flex-col gap-2">
        <Label htmlFor="specimen-email">Email</Label>
        <Input id="specimen-email" type="email" placeholder="you@example.com" />
      </div>
    </SampleFrame>
  );
}

export function SwitchSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <label className="flex items-center gap-2 text-sm">
        <Switch defaultChecked />
        Streaming
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch size="sm" />
        Compact
      </label>
    </SampleFrame>
  );
}

export function KbdSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Search
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Ask AI
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>I</Kbd>
        </KbdGroup>
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Send
        <Kbd>⏎</Kbd>
      </span>
    </SampleFrame>
  );
}

export function AvatarSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Avatar>
        <AvatarFallback>AU</AvatarFallback>
      </Avatar>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>TL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JS</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    </SampleFrame>
  );
}

export function SkeletonSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-72 items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </div>
    </SampleFrame>
  );
}

export function SeparatorSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-72 flex-col gap-3 text-sm">
        <span>Thread</span>
        <Separator />
        <div className="flex h-5 items-center gap-3">
          <span>Docs</span>
          <Separator orientation="vertical" />
          <span>Elements</span>
          <Separator orientation="vertical" />
          <span className="text-muted-foreground">Cloud</span>
        </div>
      </div>
    </SampleFrame>
  );
}

export function DialogSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Dialog>
        <DialogTrigger
          render={<Button variant="outline">Rename thread</Button>}
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename thread</DialogTitle>
            <DialogDescription>
              The new name is visible to everyone in this workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            defaultValue="Quarterly revenue dashboard"
            aria-label="Thread name"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <DialogClose render={<Button>Save</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SampleFrame>
  );
}

export function PopoverSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Popover>
        <PopoverTrigger
          render={<Button variant="outline">Context usage</Button>}
        />
        <PopoverContent className="w-64">
          <PopoverHeader>
            <PopoverTitle>Context usage</PopoverTitle>
            <PopoverDescription>
              12.4k of 200k tokens used in this thread.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </SampleFrame>
  );
}

export function TooltipSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
        <TooltipContent>Copy message</TooltipContent>
      </Tooltip>
    </SampleFrame>
  );
}

export function SheetSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Sheet>
        <SheetTrigger
          render={<Button variant="outline">Open thread list</Button>}
        />
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Threads</SheetTitle>
            <SheetDescription>
              Recent conversations in this workspace.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </SampleFrame>
  );
}

export function BreadcrumbSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/design">Design</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/design">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </SampleFrame>
  );
}

export function CollapsibleSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <SampleFrame className={frameClass}>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="w-full max-w-72"
      >
        <CollapsibleTrigger
          render={
            <Button variant="ghost" className="w-full justify-between">
              What ran in this turn
              <ChevronsUpDownIcon className="size-3.5" />
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="text-muted-foreground flex flex-col gap-1.5 px-3 py-2 font-mono text-[12px]">
            <span>&gt; read /docs/architecture</span>
            <span>&gt; ran get_weather</span>
            <span>&gt; present(&lt;Weather /&gt;)</span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SampleFrame>
  );
}
