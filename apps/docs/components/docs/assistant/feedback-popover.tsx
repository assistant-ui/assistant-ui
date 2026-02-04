"use client";

import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
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

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-border bg-popover p-4 shadow-md"
          sideOffset={5}
          align="start"
        >
          <div className="space-y-3">
            <p className="font-medium text-sm">What went wrong?</p>
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
                "w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
              )}
              rows={2}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!category}
              className={cn(
                "w-full rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm",
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
