"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ShoppingCartIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  getLibraryCartItems,
  libraryCartPrompt,
} from "@/lib/library/cart-items";
import { cn } from "@/lib/utils";
import {
  clearLibraryCart,
  removeLibraryCartItem,
  setLibraryCartOpen,
  useLibraryCart,
  useLibraryCartOpen,
} from "./cart-store";

const copyWithToast = async (text: string, copied: string) => {
  if (await copyTextToClipboard(text)) toast.success(copied);
  else toast.error("The clipboard is not available.");
};

const button =
  "focus-visible:ring-ring inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2";

export function LibraryCartButton({ className }: { className?: string }) {
  const count = useLibraryCart().length;
  return (
    <button
      type="button"
      onClick={() => setLibraryCartOpen(true)}
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring relative grid size-9 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2",
        className,
      )}
    >
      <ShoppingCartIcon aria-hidden className="size-4" />
      {count > 0 ? (
        <span
          aria-hidden
          className="bg-foreground text-background absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function LibraryCartSheet() {
  const items = getLibraryCartItems(useLibraryCart());
  const open = useLibraryCartOpen();
  const commands = items.map((item) => item.command).join("\n");

  return (
    <Dialog.Root open={open} onOpenChange={setLibraryCartOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="bg-background ring-foreground/10 fixed inset-y-2 right-2 z-50 flex w-[min(24rem,calc(100vw-1rem))] flex-col rounded-xl shadow-xl ring-1 transition-transform duration-200 outline-none data-ending-style:translate-x-[calc(100%+1rem)] data-starting-style:translate-x-[calc(100%+1rem)] motion-reduce:transition-none">
          <div className="flex items-start justify-between gap-4 p-5 pb-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-base font-medium">
                Cart
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {items.length === 0
                  ? "Add a starter from its card's menu."
                  : `${items.length} ${items.length === 1 ? "item" : "items"}`}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close cart"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring -me-1.5 grid size-8 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          {items.length > 0 ? (
            <>
              <ul className="min-h-0 flex-1 overflow-y-auto px-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="hover:bg-foreground/[0.025] flex items-center gap-2 rounded-lg py-2 ps-2 pe-1"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {item.type}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeLibraryCartItem(item.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-7 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
                    >
                      <XIcon aria-hidden className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 border-t p-5">
                <pre className="bg-foreground/[0.025] dark:bg-foreground/[0.04] text-muted-foreground max-h-40 overflow-auto rounded-xl p-3 font-mono text-xs [font-variant-ligatures:none]">
                  <code>{commands}</code>
                </pre>
                <button
                  type="button"
                  onClick={() =>
                    copyWithToast(
                      commands,
                      items.length === 1
                        ? "Install command copied."
                        : "Install commands copied.",
                    )
                  }
                  className={cn(
                    button,
                    "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {items.length === 1
                    ? "Copy install command"
                    : "Copy install commands"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyWithToast(
                      libraryCartPrompt(items),
                      "Agent prompt copied.",
                    )
                  }
                  className={cn(
                    button,
                    "bg-foreground/[0.06] hover:bg-foreground/[0.1]",
                  )}
                >
                  Copy agent prompt
                </button>
                <button
                  type="button"
                  onClick={clearLibraryCart}
                  className={cn(
                    button,
                    "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                  )}
                >
                  Clear cart
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
