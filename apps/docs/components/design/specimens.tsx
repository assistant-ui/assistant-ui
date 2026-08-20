"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  LogOutIcon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

export function ButtonSizesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </SampleFrame>
  );
}

export function ButtonIconSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Button size="icon" aria-label="Settings">
        <SettingsIcon className="size-4" />
      </Button>
      <Button size="icon-sm" variant="outline" aria-label="Settings">
        <SettingsIcon className="size-3.5" />
      </Button>
      <Button size="icon-xs" variant="ghost" aria-label="Settings">
        <SettingsIcon className="size-3" />
      </Button>
      <Button variant="outline">
        <PlusIcon className="size-4" />
        New thread
      </Button>
    </SampleFrame>
  );
}

export function DropdownMenuChecklistSpecimen(): ReactNode {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showAvatars, setShowAvatars] = useState(false);

  return (
    <SampleFrame className={frameClass}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              View
              <ChevronDownIcon className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Show in thread</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={showTimestamps}
            onCheckedChange={setShowTimestamps}
          >
            Timestamps
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showAvatars}
            onCheckedChange={setShowAvatars}
          >
            Avatars
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Markdown</DropdownMenuItem>
              <DropdownMenuItem>JSON</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </SampleFrame>
  );
}

export function InputWithButtonSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-72 items-center gap-2">
        <Input type="email" placeholder="you@example.com" />
        <Button>Invite</Button>
      </div>
    </SampleFrame>
  );
}

export function SwitchSizesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <label className="flex items-center gap-2 text-sm">
        <Switch defaultChecked />
        Default
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch size="sm" defaultChecked />
        Small
      </label>
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        <Switch disabled />
        Disabled
      </label>
    </SampleFrame>
  );
}

export function AvatarSizesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Avatar size="sm">
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    </SampleFrame>
  );
}

export function AvatarBadgeSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Avatar>
        <AvatarFallback>ON</AvatarFallback>
        <AvatarBadge className="bg-emerald-500" />
      </Avatar>
      <Avatar>
        <AvatarFallback>AW</AvatarFallback>
        <AvatarBadge className="bg-amber-500" />
      </Avatar>
    </SampleFrame>
  );
}

export function SkeletonCardSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="border-foreground/10 flex w-full max-w-72 flex-col gap-3 rounded-(--radius-surface) border p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    </SampleFrame>
  );
}

export function TooltipIconSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon" variant="ghost" aria-label="Copy message">
              <CopyIcon className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Copy message</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="icon" variant="ghost" aria-label="Regenerate">
              <RefreshCwIcon className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>
    </SampleFrame>
  );
}

export function SheetSidesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline">{side}</Button>} />
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>From the {side}</SheetTitle>
              <SheetDescription>
                The panel enters from the {side} edge.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </SampleFrame>
  );
}

export function BreadcrumbEllipsisSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/design">Design</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/design/components/breadcrumb">
              Components
            </BreadcrumbLink>
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
