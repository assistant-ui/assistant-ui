"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import type { BuilderConfig } from "./types";
import { configMatchesPreset } from "./presets";
import { encodeConfig } from "@/lib/playground-url-state";
import { BASE_URL } from "@/lib/constants";
import { analytics } from "@/lib/analytics";

interface CreateDialogProps {
  config: BuilderConfig;
  children: React.ReactNode;
  container?: React.RefObject<HTMLElement | null>;
  onOpenCodeView?: () => void;
}

export function CreateDialog({
  config,
  children,
  container,
  onOpenCodeView,
}: CreateDialogProps) {
  const [open, setOpen] = useState(false);
  const commands = generateCliCommands(config);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      analytics.builder.createDialogOpened();
    }
    setOpen(isOpen);
  };

  const handleOpenCodeView = () => {
    setOpen(false);
    onOpenCodeView?.();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal container={container?.current}>
        <DialogPrimitive.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 absolute inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 absolute top-1/2 left-1/2 z-50 grid max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in">
          <DialogPrimitive.Title className="font-semibold text-lg leading-none">
            Create your assistant
          </DialogPrimitive.Title>
          <div className="space-y-4 overflow-y-auto text-sm">
            <CommandBlock
              label={commands.primary.label}
              {...(commands.primary.description && {
                description: commands.primary.description,
              })}
              {...(commands.primary.command && {
                command: commands.primary.command,
              })}
              commandType="create"
            />

            <CommandBlock
              label={commands.alternative.label}
              {...(commands.alternative.command && {
                command: commands.alternative.command,
              })}
              commandType="shadcn"
            />

            <div className="border-t pt-4">
              <p className="mb-3 text-muted-foreground">Or set up manually:</p>
              <div className="space-y-3">
                {commands.manual.slice(0, 2).map((cmd, index) => (
                  <CommandBlock
                    key={index}
                    label={`${index + 1}. ${cmd.label}`}
                    {...(cmd.command && { command: cmd.command })}
                    {...(cmd.description && { description: cmd.description })}
                    commandType={index === 0 ? "manual_init" : "manual_add"}
                  />
                ))}
                <div>
                  <div className="mb-1 font-medium text-foreground">
                    3. Copy code
                  </div>
                  <p className="text-muted-foreground">
                    Copy the code from the{" "}
                    <button
                      onClick={handleOpenCodeView}
                      className="text-foreground underline underline-offset-2 hover:text-foreground/80"
                    >
                      Code view
                    </button>{" "}
                    into your thread.tsx
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="mb-2 font-medium text-foreground">Configuration</p>
              <div className="space-y-1 text-muted-foreground">
                {commands.summary.map((item, index) => (
                  <div key={index}>{item}</div>
                ))}
              </div>
            </div>
          </div>
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandBlock({
  label,
  description,
  command,
  commandType,
}: {
  label: string;
  description?: string;
  command?: string;
  commandType?: "create" | "shadcn" | "manual_init" | "manual_add";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!command) return;
    if (commandType) {
      analytics.builder.commandCopied(commandType);
    }
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {description && (
        <p className="mb-1.5 text-muted-foreground">{description}</p>
      )}
      {command && (
        <div className="group relative">
          <pre className="scrollbar-none overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
            {command}
          </pre>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-md bg-muted px-1">
            <div className="pointer-events-none absolute inset-y-0 -left-3 w-3 bg-gradient-to-r from-transparent to-muted" />
            <button
              onClick={handleCopy}
              className="pointer-events-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100"
              title="Copy command"
            >
              {copied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CliCommand {
  label: string;
  description?: string;
  command?: string;
}

interface CliCommands {
  primary: CliCommand;
  alternative: CliCommand;
  manual: CliCommand[];
  summary: string[];
}

function generateCliCommands(config: BuilderConfig): CliCommands {
  const { components } = config;

  const matchingPreset = configMatchesPreset(config);
  const playgroundInitUrl = `${BASE_URL}/playground/init`;
  const presetUrl = matchingPreset
    ? `${playgroundInitUrl}?preset=${matchingPreset.id}`
    : `${playgroundInitUrl}?c=${encodeConfig(config)}`;

  const componentsToAdd: string[] = ["thread"];

  if (components.markdown) {
    componentsToAdd.push("markdown-text", "tool-fallback");
  }

  componentsToAdd.push("tooltip-icon-button");

  if (components.attachments) {
    componentsToAdd.push("attachment");
  }

  if (components.reasoning) {
    componentsToAdd.push("reasoning");
  }

  if (components.sources) {
    componentsToAdd.push("sources");
  }

  const addCommand = `npx assistant-ui@latest add ${componentsToAdd.join(" ")}`;

  const enabledFeatures: string[] = [];
  if (components.markdown) enabledFeatures.push("Markdown");
  if (components.attachments) enabledFeatures.push("Attachments");
  if (components.branchPicker) enabledFeatures.push("Branch Picker");
  if (components.editMessage) enabledFeatures.push("Edit Message");
  if (components.threadWelcome) enabledFeatures.push("Welcome Screen");
  if (components.suggestions) enabledFeatures.push("Suggestions");
  if (components.scrollToBottom) enabledFeatures.push("Scroll to Bottom");
  if (components.reasoning) enabledFeatures.push("Reasoning");
  if (components.sources) enabledFeatures.push("Sources");
  if (components.followUpSuggestions) enabledFeatures.push("Follow-ups");
  if (components.avatar) enabledFeatures.push("Avatar");
  if (components.actionBar.copy) enabledFeatures.push("Copy");
  if (components.actionBar.reload) enabledFeatures.push("Reload");
  if (components.actionBar.speak) enabledFeatures.push("Speak");
  if (components.actionBar.feedback) enabledFeatures.push("Feedback");

  const summary: string[] = [
    `Style: ${config.styles.borderRadius} radius, ${config.styles.fontFamily}`,
    `Enabled: ${enabledFeatures.length > 0 ? enabledFeatures.join(", ") : "None"}`,
  ];

  return {
    primary: {
      label: "One-command setup",
      description: "Install with your current configuration",
      command: `npx assistant-ui@latest create my-app --preset "${presetUrl}"`,
    },
    alternative: {
      label: "Using shadcn",
      command: `npx shadcn@latest add "${presetUrl}"`,
    },
    manual: [
      {
        label: "Initialize",
        command: "npx assistant-ui@latest init",
      },
      {
        label: "Add components",
        command: addCommand,
      },
      {
        label: "Copy code",
        description: "Copy the code from the Code view into your thread.tsx",
      },
    ],
    summary,
  };
}
