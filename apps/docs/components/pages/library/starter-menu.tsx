"use client";

import {
  BotIcon,
  CheckIcon,
  PlusIcon,
  ShoppingCartIcon,
  TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  starterCommand,
  starterId,
  starterPrompt,
  type Starter,
} from "@/lib/library/starters-data";
import {
  setLibraryCartOpen,
  toggleLibraryCartItem,
  useLibraryCart,
} from "./cart-store";

const CART_TOAST_ID = "aui-library-cart";
import {
  LibraryMenu,
  LibraryMenuContent,
  LibraryMenuItem,
  LibraryMenuTrigger,
} from "./library-menu";

const copyWithToast = async (text: string, copied: string) => {
  if (await copyTextToClipboard(text)) toast.success(copied);
  else toast.error("The clipboard is not available.");
};

export function StarterMenu({
  starter,
  className,
}: {
  starter: Starter;
  className?: string;
}) {
  const id = starterId(starter);
  const inCart = useLibraryCart().includes(id);

  return (
    <LibraryMenu>
      <LibraryMenuTrigger
        aria-label={`Options for ${starter.label}${inCart ? ", in cart" : ""}`}
        className={className}
      >
        {inCart ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
      </LibraryMenuTrigger>
      <LibraryMenuContent>
        <LibraryMenuItem
          onClick={() =>
            copyWithToast(starterCommand(starter), "Install command copied.")
          }
        >
          <TerminalIcon aria-hidden />
          Copy install command
        </LibraryMenuItem>
        <LibraryMenuItem
          onClick={() =>
            copyWithToast(starterPrompt(starter), "Agent prompt copied.")
          }
        >
          <BotIcon aria-hidden />
          Copy agent prompt
        </LibraryMenuItem>
        <LibraryMenuItem
          onClick={() => {
            const added = toggleLibraryCartItem(id);
            toast.success(
              added
                ? `${starter.label} added to cart.`
                : `${starter.label} removed from cart.`,
              {
                id: CART_TOAST_ID,
                action: {
                  label: "View cart",
                  onClick: () => setLibraryCartOpen(true),
                },
              },
            );
          }}
        >
          {inCart ? (
            <CheckIcon aria-hidden />
          ) : (
            <ShoppingCartIcon aria-hidden />
          )}
          {inCart ? "Remove from cart" : "Add to cart"}
        </LibraryMenuItem>
      </LibraryMenuContent>
    </LibraryMenu>
  );
}
