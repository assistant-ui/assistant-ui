"use client";

import { useState, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "wrong_information", label: "Wrong information" },
  { value: "outdated", label: "Outdated" },
  { value: "didnt_answer", label: "Didn't answer my question" },
  { value: "too_vague", label: "Too vague" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackCategory = (typeof CATEGORIES)[number]["value"];

type FeedbackPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (category: FeedbackCategory, comment?: string) => void;
  children: ReactNode;
};

export function FeedbackPopover({
  open,
  onOpenChange,
  onSubmit,
  children,
}: FeedbackPopoverProps): ReactNode {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!category) return;
    onSubmit(category, comment || undefined);
    setCategory(null);
    setComment("");
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing without submitting
      setCategory(null);
      setComment("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="border-border bg-popover z-50 w-72 rounded-lg border p-4 shadow-md"
          sideOffset={5}
          align="start"
        >
          <div className="space-y-3">
            <p className="text-sm font-medium">What went wrong?</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="feedback-category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="accent-primary"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
            <textarea
              placeholder="Additional details (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={cn(
                "border-border bg-background w-full resize-none rounded-md border px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:ring-ring focus:ring-1 focus:outline-none",
              )}
              rows={2}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!category}
              className={cn(
                "bg-primary text-primary-foreground w-full rounded-md px-3 py-1.5 text-sm font-medium",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "hover:bg-primary/90",
              )}
            >
              Submit
            </button>
          </div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
