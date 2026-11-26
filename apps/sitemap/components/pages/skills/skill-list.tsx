"use client";

import {
  ComputerTerminal01Icon,
  Copy01Icon,
  Download04Icon,
  File01Icon,
  MoreHorizontalIcon,
  ShoppingCart01Icon,
  ShoppingCartRemove01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { GenerativeMarkdown } from "@/components/assistant-ui/elements/generative-markdown";
import { CartSheet } from "@/components/library/cart-sheet";
import { ItemMark } from "@/components/library/item-mark";
import { copyWithToast, ItemMenu } from "@/components/library/item-menu";
import {
  libraryCart,
  LibraryProvider,
} from "@/components/library/library-context";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/library/ui/menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LibraryItem } from "@/lib/library/catalog";

export type SkillRow = {
  item: LibraryItem;
  lead: string;
  command: string;
  content: string;
};

/** SKILL.md as the dialog reads it: the file's own `#` title repeats the dialog's, so it is left out. */
export const body = (content: string) => content.replace(/^# .*\n+/, "");

function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-SKILL.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export const markdown = [
  "text-[15px] leading-relaxed text-pretty [overflow-wrap:anywhere]",
  "[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2:first-child]:mt-0",
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-[15px] [&_h3]:font-semibold",
  "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-1",
  "[&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-3 hover:[&_a]:decoration-foreground",
  "[&_:not(pre)>code]:bg-foreground/[0.06] [&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em]",
  "[&_pre]:bg-background [&_pre]:rounded-document [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-relaxed",
  "[&_table]:my-3 [&_table]:w-full [&_table]:text-sm [&_th]:py-1.5 [&_th]:pe-4 [&_th]:text-start [&_th]:font-medium [&_td]:py-1.5 [&_td]:pe-4 [&_td]:align-top",
  "[&_code]:[font-variant-ligatures:none] [&_strong]:font-semibold [&_blockquote]:text-muted-foreground [&_blockquote]:ps-4",
].join(" ");

function SkillDialogBody({ skill }: { skill: SkillRow }) {
  const { item } = skill;
  const inCart = libraryCart.useCartSlugs().includes(item.id);

  const toggleCart = () => {
    const added = libraryCart.toggleCartSlug(item.id);
    toast.success(
      added ? `${item.name} added to cart.` : `${item.name} removed from cart.`,
      {
        id: "aui-library-cart",
        ...(added && {
          action: {
            label: "View cart",
            onClick: () => libraryCart.setCartOpen(true),
          },
        }),
      },
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <ItemMark item={item} />
        <div className="flex items-center gap-1">
          <Menu>
            <MenuTrigger
              aria-label={`More for ${item.name}`}
              className="size-8 justify-center p-0"
              render={<Button variant="ghost" size="icon" />}
            >
              <HugeiconsIcon
                icon={MoreHorizontalIcon}
                strokeWidth={1.75}
                aria-hidden
              />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem
                onClick={() => copyWithToast(item.prompt, "Prompt copied.")}
              >
                <HugeiconsIcon
                  icon={Copy01Icon}
                  strokeWidth={1.5}
                  aria-hidden
                />
                Copy assistant-ui prompt
              </MenuItem>
              <MenuItem
                onClick={() => copyWithToast(skill.content, "SKILL.md copied.")}
              >
                <HugeiconsIcon
                  icon={File01Icon}
                  strokeWidth={1.5}
                  aria-hidden
                />
                Copy Markdown
              </MenuItem>
              <MenuItem onClick={() => download(item.name, skill.content)}>
                <HugeiconsIcon
                  icon={Download04Icon}
                  strokeWidth={1.5}
                  aria-hidden
                />
                Download
              </MenuItem>
            </MenuContent>
          </Menu>
          <DialogClose
            render={<Button variant="ghost" size="icon" />}
            aria-label="Close"
          >
            <XIcon />
          </DialogClose>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <DialogTitle className="text-xl leading-tight font-semibold">
          <span className="font-mono [font-variant-ligatures:none]">
            /{item.name}
          </span>{" "}
          <span className="text-muted-foreground font-normal">Skill</span>
        </DialogTitle>
        <DialogDescription className="text-[15px] leading-relaxed text-pretty">
          {skill.lead}
        </DialogDescription>
      </div>

      <div
        className={`rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] text-foreground min-h-48 flex-1 overflow-y-auto px-3.5 py-3 ${markdown}`}
      >
        <GenerativeMarkdown value={body(skill.content)} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant={inCart ? "destructive" : "outline"}
          onClick={toggleCart}
        >
          <HugeiconsIcon
            icon={inCart ? ShoppingCartRemove01Icon : ShoppingCart01Icon}
            strokeWidth={1.5}
            aria-hidden
          />
          {inCart ? "Remove from cart" : "Add to cart"}
        </Button>
        <Button
          onClick={() =>
            copyWithToast(skill.command, "Install command copied.")
          }
        >
          <HugeiconsIcon
            icon={ComputerTerminal01Icon}
            strokeWidth={1.5}
            aria-hidden
          />
          Copy install command
        </Button>
      </div>
    </>
  );
}

function Skill({ skill }: { skill: SkillRow }) {
  const { item } = skill;
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink hover:bg-foreground/[0.025] rounded-control relative -mx-3 flex items-center gap-4 px-3 py-3 transition-colors"
    >
      <ItemMark item={item} />
      <Dialog>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-[15px] leading-6">
            <DialogTrigger className="focus-visible:ring-ring rounded-sm font-mono text-sm font-medium outline-none [font-variant-ligatures:none] after:absolute after:inset-0 after:content-[''] focus-visible:ring-2">
              /{item.name}
            </DialogTrigger>
          </h3>
          <p className="text-muted-foreground line-clamp-2 text-sm text-pretty">
            {skill.lead}
          </p>
        </div>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(34rem,calc(100dvh-4rem))] flex-col gap-3 p-3 sm:max-w-xl sm:p-4"
        >
          <SkillDialogBody skill={skill} />
        </DialogContent>
      </Dialog>
      <div className="relative z-10 shrink-0">
        <ItemMenu item={item} />
      </div>
    </li>
  );
}

/** The skills as library rows: glyph, name, summary, and the library's add or copy menu. A row opens its SKILL.md in a dialog. */
export function SkillList({ skills }: { skills: readonly SkillRow[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-1">
      {skills.map((skill) => (
        <Skill key={skill.item.id} skill={skill} />
      ))}
    </ul>
  );
}

/** One library provider and cart sheet for the page, so every add-to-cart on it shares the library's cart. */
export function SkillsLibrary({
  items,
  children,
}: {
  items: readonly LibraryItem[];
  children: ReactNode;
}) {
  return (
    <LibraryProvider items={items}>
      {children}
      <CartSheet />
    </LibraryProvider>
  );
}
