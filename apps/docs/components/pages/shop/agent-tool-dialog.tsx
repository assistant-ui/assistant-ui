"use client";

import { useId, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AGENT_TOOL_PRESETS } from "@/lib/catalog/agent-tool-config";
import { addAgentTool } from "@/lib/catalog/cart-store";
import { useCheckoutSession } from "@/lib/checkout/session-store";
import { analytics } from "@/lib/analytics";

const options = [
  { value: "", label: "Choose an action" },
  ...AGENT_TOOL_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.name,
  })),
  { value: "custom", label: "Custom tool" },
];

export function AgentToolDialog({
  presetId,
  size = "sm",
  variant = "default",
  className,
}: {
  presetId?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  className?: string | undefined;
}) {
  const id = useId();
  const target = useCheckoutSession() ? "next setup" : "setup";
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const selectAction = (value: string) => {
    const preset = AGENT_TOOL_PRESETS.find((entry) => entry.id === value);
    setAction(value);
    setName(preset?.name ?? "");
    setPurpose(preset?.purpose ?? "");
  };
  const presetName = AGENT_TOOL_PRESETS.find(
    (entry) => entry.id === presetId,
  )?.name;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) selectAction(presetId ?? "");
      }}
    >
      <DialogTrigger
        render={
          <Button
            size={size}
            variant={variant}
            className={className}
            aria-label={`Configure ${presetName ?? "Agent Tool"} for ${target}`}
          />
        }
      >
        <PlusIcon data-icon="inline-start" />
        {presetName ? `Add to ${target}` : "Configure tool"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure an agent tool</DialogTitle>
          <DialogDescription>
            Each addition creates a separate tool. Your coding agent connects it
            to your project during setup.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!action || !name.trim() || !purpose.trim()) return;
            addAgentTool(name, purpose);
            analytics.shop.cartToggled("agent-tools", true);
            setOpen(false);
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-action`} className="text-sm font-medium">
              What should the tool do?
            </label>
            <Select
              value={action}
              items={options}
              onValueChange={(value) => {
                if (value !== null) selectAction(value);
              }}
            >
              <SelectTrigger id={`${id}-action`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {action ? (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-name`} className="text-sm font-medium">
                  Tool name
                </label>
                <Input
                  id={`${id}-name`}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={`${id}-purpose`}
                  className="text-sm font-medium"
                >
                  Tool behavior
                </label>
                <Textarea
                  id={`${id}-purpose`}
                  required
                  rows={4}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="Describe the action and the data it needs."
                />
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!action || !name.trim() || !purpose.trim()}
            >
              Add to {target}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
