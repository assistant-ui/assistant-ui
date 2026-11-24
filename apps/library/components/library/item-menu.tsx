"use client";

import {
  Add01Icon,
  ComputerTerminal01Icon,
  Copy01Icon,
  ShoppingCart01Icon,
  ShoppingCartRemove01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/library/ui/menu";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { installCommand, type LibraryItem } from "@/lib/library/catalog";
import { libraryCart } from "./library-context";

const CART_TOAST_ID = "aui-library-cart";

export async function copyWithToast(text: string, copied: string) {
  if (await copyTextToClipboard(text)) toast.success(copied);
  else toast.error("The clipboard is not available.");
}

export function ItemMenu({ item }: { item: LibraryItem }) {
  const added = libraryCart.useCartSlugs().includes(item.id);
  const { install } = item;

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Options for ${item.name}${added ? ", in cart" : ""}`}
        className="size-7 justify-center p-0 pointer-coarse:size-9"
        render={
          <TooltipIconButton
            tooltip={added ? "In cart. Remove or copy" : "Add or copy"}
          />
        }
      >
        <HugeiconsIcon
          icon={added ? Tick02Icon : Add01Icon}
          strokeWidth={1.75}
          aria-hidden
        />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem
          onClick={() => {
            if (!libraryCart.toggleCartSlug(item.id)) return;
            toast.success(`${item.name} added to cart.`, {
              id: CART_TOAST_ID,
              action: {
                label: "View cart",
                onClick: () => libraryCart.setCartOpen(true),
              },
            });
          }}
        >
          <HugeiconsIcon
            icon={added ? ShoppingCartRemove01Icon : ShoppingCart01Icon}
            strokeWidth={1.5}
            aria-hidden
          />
          {added ? "Remove from cart" : "Add to cart"}
        </MenuItem>
        {install ? (
          <MenuItem
            onClick={() =>
              copyWithToast(installCommand(install), "Install command copied.")
            }
          >
            <HugeiconsIcon
              icon={ComputerTerminal01Icon}
              strokeWidth={1.5}
              aria-hidden
            />
            Copy install command
          </MenuItem>
        ) : null}
        <MenuItem onClick={() => copyWithToast(item.prompt, "Prompt copied.")}>
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.5} aria-hidden />
          Copy assistant-ui prompt
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
