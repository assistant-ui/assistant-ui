"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/radix/avatar";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/radix/breadcrumb";
import { Button } from "@/components/ui/radix/button";
import { Callout } from "@/components/ui/radix/callout";
import { CodeBlock } from "@/components/ui/radix/code-block";
import { CommandTabs } from "@/components/ui/radix/command-tabs";
import {
  Definition,
  DefinitionAnnotation,
  DefinitionDetails,
  DefinitionList,
  DefinitionName,
  DefinitionTerm,
} from "@/components/ui/radix/definition-list";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/radix/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/radix/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/radix/dialog";
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
} from "@/components/ui/radix/dropdown-menu";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/radix/combobox";
import { Input } from "@/components/ui/radix/input";
import { Kbd, KbdGroup } from "@/components/ui/radix/kbd";
import { Label } from "@/components/ui/radix/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/radix/popover";
import { Separator } from "@/components/ui/radix/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/radix/sheet";
import { Skeleton } from "@/components/ui/radix/skeleton";
import { Step, Steps } from "@/components/ui/radix/steps";
import { Switch } from "@/components/ui/radix/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/radix/tooltip";

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

export function DropdownMenuSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Open menu
            <ChevronDownIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
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

export function DropdownMenuChecklistSpecimen(): ReactNode {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showAvatars, setShowAvatars] = useState(false);

  return (
    <SampleFrame className={frameClass}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            View
            <ChevronDownIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
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

export function InputSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-64 flex-col gap-2">
        <Label htmlFor="specimen-radix-email">Email</Label>
        <Input
          id="specimen-radix-email"
          type="email"
          placeholder="you@example.com"
        />
      </div>
    </SampleFrame>
  );
}

export function InputWithButtonSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-72 items-center gap-2">
        <Input type="email" aria-label="Email" placeholder="you@example.com" />
        <Button>Invite</Button>
      </div>
    </SampleFrame>
  );
}

export function ComboboxSpecimen(): ReactNode {
  const runtimes = [
    "AI SDK",
    "LangGraph",
    "LangChain",
    "Mastra",
    "External Store",
    "Local",
  ];
  return (
    <SampleFrame className={frameClass}>
      <Combobox items={runtimes} defaultValue="AI SDK">
        <ComboboxInput
          className="w-56"
          placeholder="Search runtimes…"
          aria-label="Search runtimes"
        />
        <ComboboxContent>
          <ComboboxEmpty>No runtimes found.</ComboboxEmpty>
          <ComboboxList>
            {(runtime: string) => (
              <ComboboxItem key={runtime} value={runtime}>
                {runtime}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </SampleFrame>
  );
}

export function ComboboxGroupsSpecimen(): ReactNode {
  const groups = [
    {
      value: "Frameworks",
      items: ["AI SDK", "LangGraph", "LangChain", "Mastra"],
    },
    { value: "Custom", items: ["External Store", "Local"] },
  ];
  return (
    <SampleFrame className={frameClass}>
      <Combobox items={groups}>
        <ComboboxInput
          className="w-56"
          placeholder="Search runtimes…"
          aria-label="Search runtimes"
        />
        <ComboboxContent>
          <ComboboxEmpty>No runtimes found.</ComboboxEmpty>
          <ComboboxList>
            {(group: { value: string; items: string[] }) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(runtime: string) => (
                    <ComboboxItem key={runtime} value={runtime}>
                      {runtime}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </SampleFrame>
  );
}

export function ComboboxStatesSpecimen(): ReactNode {
  const runtimes = ["AI SDK", "LangGraph", "LangChain", "Mastra"];
  return (
    <SampleFrame className={frameClass}>
      <Combobox items={runtimes} defaultValue="LangGraph">
        <ComboboxInput
          className="w-56"
          showClear
          placeholder="Search runtimes…"
          aria-label="Search runtimes"
        />
        <ComboboxContent>
          <ComboboxEmpty>No runtimes found.</ComboboxEmpty>
          <ComboboxList>
            {(runtime: string) => (
              <ComboboxItem key={runtime} value={runtime}>
                {runtime}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Combobox items={runtimes} defaultValue="AI SDK" disabled>
        <ComboboxInput
          className="w-56"
          placeholder="Search runtimes…"
          aria-label="Search runtimes"
        />
        <ComboboxContent>
          <ComboboxEmpty>No runtimes found.</ComboboxEmpty>
          <ComboboxList>
            {(runtime: string) => (
              <ComboboxItem key={runtime} value={runtime}>
                {runtime}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
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
        <DialogTrigger asChild>
          <Button variant="outline">Rename thread</Button>
        </DialogTrigger>
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
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Save</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SampleFrame>
  );
}

export function ToastSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Button
        variant="outline"
        onClick={() =>
          toast("Thread archived", {
            description: "It stays in the archive until you restore it.",
            action: { label: "Undo", onClick: () => toast("Thread restored") },
          })
        }
      >
        Archive thread
      </Button>
      <Button variant="outline" onClick={() => toast.success("Command copied")}>
        Copy command
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("The model did not respond")}
      >
        Fail a request
      </Button>
    </SampleFrame>
  );
}

export function ToastTypesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Button
        variant="outline"
        onClick={() => toast.info("A new version of the CLI is available")}
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning("This adapter needs an API key")}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
            loading: "Exporting thread…",
            success: "Exported as markdown",
            error: "Export failed",
          })
        }
      >
        Run a promise
      </Button>
    </SampleFrame>
  );
}

export function PopoverSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Context usage</Button>
        </PopoverTrigger>
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SampleFrame>
  );
}

export function TooltipIconSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Copy message">
              <CopyIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Regenerate">
              <RefreshCwIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SampleFrame>
  );
}

export function SheetSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open thread list</Button>
        </SheetTrigger>
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

export function SheetSidesSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
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

export function CollapsibleSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <SampleFrame className={frameClass}>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="w-full max-w-72"
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            What ran in this turn
            <ChevronsUpDownIcon className="size-3.5" />
          </Button>
        </CollapsibleTrigger>
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

export function CalloutSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center gap-1 p-10">
      <Callout type="info">
        Streaming starts after the first token arrives.
      </Callout>
      <Callout type="warning">
        This adapter needs an API key at build time.
      </Callout>
      <Callout type="success">The thread was exported as markdown.</Callout>
    </SampleFrame>
  );
}

export function CalloutTitledSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center gap-1 p-10">
      <Callout type="idea" title="Tip">
        Press <Kbd>⌘</Kbd> <Kbd>I</Kbd> anywhere on the site to ask the docs.
      </Callout>
      <Callout type="error" title="Build failed">
        The registry item names a file that does not exist.
      </Callout>
    </SampleFrame>
  );
}

export function StepsSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto justify-center p-10">
      <Steps className="w-full max-w-96">
        <Step>
          <p className="text-sm font-medium">Install the package</p>
          <p className="text-muted-foreground mt-1 text-sm">
            One command adds the runtime and the styles.
          </p>
        </Step>
        <Step>
          <p className="text-sm font-medium">Wrap your app</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The provider carries the thread state.
          </p>
        </Step>
        <Step>
          <p className="text-sm font-medium">Send a message</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The thread streams from your backend.
          </p>
        </Step>
      </Steps>
    </SampleFrame>
  );
}

export function CodeBlockSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <CodeBlock title="debounce.ts" className="my-0 w-full">
        <pre>
          <code className="text-foreground/80 block text-[12.5px]">
            <span className="line">
              {"export function debounce(fn, wait) {"}
            </span>
            <span className="line">{"  let timer;"}</span>
            <span className="line">{"  return (...args) => {"}</span>
            <span className="line">{"    clearTimeout(timer);"}</span>
            <span className="line">
              {"    timer = setTimeout(() => fn(...args), wait);"}
            </span>
            <span className="line">{"  };"}</span>
            <span className="line">{"}"}</span>
          </code>
        </pre>
      </CodeBlock>
    </SampleFrame>
  );
}

export function CodeBlockBareSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <CodeBlock className="my-0 w-full">
        <pre>
          <code className="text-foreground/80 block text-[12.5px]">
            <span className="line">{"npx assistant-ui init"}</span>
          </code>
        </pre>
      </CodeBlock>
    </SampleFrame>
  );
}

export function CommandTabsSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <CommandTabs
        className="my-0 w-full"
        storageKey="specimen-command-tabs"
        commands={{
          npm: "npm install @assistant-ui/react",
          pnpm: "pnpm add @assistant-ui/react",
          yarn: "yarn add @assistant-ui/react",
          bun: "bun add @assistant-ui/react",
        }}
      />
    </SampleFrame>
  );
}

export function CommandTabsSyncSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center gap-4 p-10">
      <CommandTabs
        className="my-0 w-full"
        storageKey="specimen-command-tabs"
        commands={{
          npm: "npx assistant-ui init",
          pnpm: "pnpm dlx assistant-ui init",
          yarn: "yarn dlx assistant-ui init",
          bun: "bunx assistant-ui init",
        }}
      />
      <CommandTabs
        className="my-0 w-full"
        storageKey="specimen-command-tabs"
        commands={{
          npm: "npx shadcn@latest add @assistant-ui/thread",
          pnpm: "pnpm dlx shadcn@latest add @assistant-ui/thread",
          yarn: "npx shadcn@latest add @assistant-ui/thread",
          bun: "bunx --bun shadcn@latest add @assistant-ui/thread",
        }}
      />
    </SampleFrame>
  );
}

export function TableSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <Table>
        <TableCaption>Radius scale of the design system.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Applies to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code>--radius-control</code>
            </TableCell>
            <TableCell>8px</TableCell>
            <TableCell>Buttons, inputs, menu items</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-surface</code>
            </TableCell>
            <TableCell>10px</TableCell>
            <TableCell>Cards, popovers, panels</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-xl</code>
            </TableCell>
            <TableCell>12px</TableCell>
            <TableCell>Dialogs, large surfaces</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-thread</code>
            </TableCell>
            <TableCell>16px</TableCell>
            <TableCell>The chat viewport</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </SampleFrame>
  );
}

export function DefinitionListSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <DefinitionList>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>commands</DefinitionName>
            <DefinitionAnnotation>
              {"Record<string, string>"}
            </DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Tab label to command line, in display order.
          </DefinitionDetails>
        </Definition>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>storageKey?</DefinitionName>
            <DefinitionAnnotation>string</DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Persists the selected tab and keeps every instance with the same key
            in sync.
          </DefinitionDetails>
        </Definition>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>onValueChange?</DefinitionName>
            <DefinitionAnnotation>
              {"(value: string) => void"}
            </DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Called when the user picks a tab.
          </DefinitionDetails>
        </Definition>
      </DefinitionList>
    </SampleFrame>
  );
}
