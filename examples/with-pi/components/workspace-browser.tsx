"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Folder } from "lucide-react";
import type { FsListing } from "@/app/api/pi/fs/route";
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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

/** Server-backed directory browser. Click a folder to navigate in; the footer
 *  commits whatever directory is currently in view. */
export function WorkspaceBrowser({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [listing, setListing] = useState<FsListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Monotonic request token: rapid navigation fires overlapping fetches, and a
  // slow earlier response must not overwrite the directory navigated to last.
  const requestSeq = useRef(0);

  const load = (path?: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const qs = path ? `?path=${encodeURIComponent(path)}` : "";
    fetch(`/api/pi/fs${qs}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to list directory (HTTP ${response.status})`);
        }
        return (await response.json()) as FsListing;
      })
      .then((data) => {
        if (seq === requestSeq.current) setListing(data);
      })
      .catch((err: unknown) => {
        if (seq === requestSeq.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  };

  const currentName = value.split("/").filter(Boolean).at(-1);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load(value || undefined);
      }}
    >
      <div className="flex items-center gap-2">
        {currentName && (
          <span
            className="text-muted-foreground max-w-72 truncate font-mono text-xs"
            title={value}
          >
            …/{currentName}
          </span>
        )}
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Browse…
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="min-w-0">
          <DialogTitle>Select workspace</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">
            {listing?.path ?? "…"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            disabled={!listing?.parent || loading}
            onClick={() => listing?.parent && load(listing.parent)}
          >
            <ArrowLeft /> Back
          </Button>
          {loading && <Spinner className="size-4" />}
        </div>

        <ScrollArea className="h-72 min-w-0 rounded-md border [&_[data-radix-scroll-area-viewport]>div]:!block">
          {error && (
            <p className="text-destructive px-3 py-2 text-xs">{error}</p>
          )}
          {listing?.entries.map((entry) => (
            <button
              key={entry.path}
              type="button"
              onClick={() => load(entry.path)}
              className="hover:bg-accent flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left font-mono text-xs"
            >
              <Folder className="size-3.5 shrink-0" />
              <span className="truncate">{entry.name}</span>
            </button>
          ))}
          {listing && listing.entries.length === 0 && (
            <p className="text-muted-foreground px-3 py-2 text-xs">
              No subfolders
            </p>
          )}
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!listing}
            onClick={() => {
              if (listing) onCommit(listing.path);
              setOpen(false);
            }}
          >
            Select this folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
