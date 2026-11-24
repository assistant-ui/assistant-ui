"use client";

import { useState } from "react";
import {
  ChartLineData01Icon,
  Delete01Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MODEL, clearMade, useMade } from "./state";
import {
  Icon,
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
  focusRing,
  rItem,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* The person at the foot of the sidebar, and what they have used             */
/* -------------------------------------------------------------------------- */

const count = (value: number) => value.toLocaleString("en-US");

export function User() {
  const made = useMade();
  const [usageOpen, setUsageOpen] = useState(false);

  return (
    <>
      <Menu>
        <MenuTrigger
          className={cn(
            "hover:bg-accent data-popup-open:bg-accent flex h-11 w-full items-center gap-2.5 px-2 text-start transition-colors motion-reduce:transition-none",
            rItem,
            focusRing,
          )}
        >
          <img
            src="/blocks/avatars/you.svg"
            alt=""
            className="size-7 shrink-0 rounded-full"
          />
          <span className="flex min-w-0 flex-1 flex-col leading-4">
            <span className="truncate font-medium">You</span>
            <span className="text-muted-foreground truncate text-xs">
              {made.length === 1
                ? "1 picture"
                : `${count(made.length)} pictures`}
            </span>
          </span>
          <Icon
            icon={UnfoldMoreIcon}
            className="text-muted-foreground size-4 shrink-0"
          />
        </MenuTrigger>
        <MenuPopup side="top" className="w-(--anchor-width)">
          <MenuItem onClick={() => setUsageOpen(true)}>
            <Icon icon={ChartLineData01Icon} />
            Usage
          </MenuItem>
          <MenuSeparator />
          <MenuItem disabled={made.length === 0} onClick={clearMade}>
            <Icon icon={Delete01Icon} />
            Clear my images
          </MenuItem>
        </MenuPopup>
      </Menu>
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Usage</DialogTitle>
            <DialogDescription>
              Counted for this visit. Nothing is saved.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col text-sm">
            <Row label="Pictures made" value={count(made.length)} />
            <Row
              label="Tokens used"
              value={count(made.reduce((sum, item) => sum + item.tokens, 0))}
            />
            <Row label="Model" value={MODEL} mono />
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-border/60 flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}
