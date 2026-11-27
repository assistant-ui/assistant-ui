"use client";

import {
  BotIcon,
  CheckIcon,
  PlusIcon,
  ShoppingCartIcon,
  TerminalIcon,
} from "lucide-react";
import {
  starterCommand,
  starterId,
  starterPrompt,
  type Starter,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import {
  setLibraryCartOpen,
  toggleLibraryCartItem,
  useLibraryCart,
} from "./cart-store";
import {
  LibraryMenu,
  LibraryMenuContent,
  LibraryMenuItem,
  LibraryMenuSeparator,
  LibraryMenuTrigger,
} from "./library-menu";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { LibraryTooltip } from "./library-tooltip";

export function StarterMenu({
  starter,
  tooltipSide = "left",
  className,
}: {
  starter: Starter;
  tooltipSide?: "left" | "top";
  className?: string;
}) {
  const id = starterId(starter);
  const inCart = useLibraryCart().includes(id);

  return (
    <LibraryMenu>
      <LibraryTooltip side={tooltipSide} label="Add or copy">
        <LibraryMenuTrigger
          aria-label={`Options for ${starter.label}${inCart ? ", in cart" : ""}`}
          className={cn(
            "bg-background/45 text-foreground ring-foreground/10 hover:bg-background/70 data-popup-open:bg-background/70 size-8 rounded-full ring-1 backdrop-blur-md",
            className,
          )}
        >
          {inCart ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
        </LibraryMenuTrigger>
      </LibraryTooltip>
      <LibraryMenuContent side="bottom" align="end">
        <LibraryMenuItem
          onClick={() => {
            const added = toggleLibraryCartItem(id);
            libraryToast.success(
              added
                ? `${starter.label} added to cart.`
                : `${starter.label} removed from cart.`,
              {
                group: "cart",
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
        <LibraryMenuSeparator />
        <LibraryMenuItem
          onClick={() =>
            copyWithLibraryToast(
              starterCommand(starter),
              "Install command copied.",
            )
          }
        >
          <TerminalIcon aria-hidden />
          Copy install command
        </LibraryMenuItem>
        <LibraryMenuItem
          onClick={() =>
            copyWithLibraryToast(starterPrompt(starter), "Agent prompt copied.")
          }
        >
          <BotIcon aria-hidden />
          Copy agent prompt
        </LibraryMenuItem>
      </LibraryMenuContent>
    </LibraryMenu>
  );
}
