"use client";

import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { useAui } from "@assistant-ui/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  RATIOS,
  TEMPLATES,
  TRENDING,
  tileSrc,
  useMade,
  useOptions,
  type Template,
} from "./state";
import {
  Icon,
  Menu,
  MenuChoice,
  MenuPopup,
  MenuRadioGroup,
  MenuTrigger,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  rItem,
  rSurface,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* Gallery: what a new chat shows until a picture is asked for                */
/* -------------------------------------------------------------------------- */

const TABS = [
  { value: "templates", label: "Templates" },
  { value: "trending", label: "Trending" },
  { value: "mine", label: "My images" },
] as const;

const grid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export function Gallery() {
  return (
    <div className="mx-auto w-full max-w-6xl pt-2">
      <h1 className="pb-5 text-3xl font-medium tracking-tight">Images</h1>
      <Tabs.Root defaultValue="templates">
        <Tabs.List className="flex gap-1 pb-4">
          {TABS.map((tab) => (
            <Tabs.Tab
              key={tab.value}
              value={tab.value}
              className={cn(
                "text-muted-foreground hover:text-foreground aria-selected:bg-foreground/[0.06] aria-selected:text-foreground flex h-8 items-center rounded-full px-3.5 transition-colors motion-reduce:transition-none",
                focusRing,
              )}
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="templates" className="outline-none">
          <Templates />
        </Tabs.Panel>
        <Tabs.Panel value="trending" className="outline-none">
          <Trending />
        </Tabs.Panel>
        <Tabs.Panel value="mine" className="outline-none">
          <Mine />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

/* A tile: the template's picture over its own tint, with its name at the foot. */
function Templates() {
  const [open, setOpen] = useState<Template | null>(null);

  return (
    <>
      <ul className={grid}>
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => setOpen(template)}
              style={{ backgroundColor: template.tint }}
              className={cn(
                "group relative block aspect-[4/5] w-full overflow-hidden",
                rSurface,
                focusRing,
              )}
            >
              <img
                src={tileSrc(template.id)}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-3.5 pt-12 pb-3 text-start text-base font-medium text-white">
                {template.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <TemplateDialog template={open} onClose={() => setOpen(null)} />
    </>
  );
}

/*
 * A template up close: its picture, its prompt, and the shape to make it
 * in. Using it writes the prompt in the message box, to send as it is or
 * with your own details added.
 */
function TemplateDialog({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  const aui = useAui();
  const { setRatio, inputRef } = useOptions();
  // The last template stays drawn while the dialog closes.
  const [shown, setShown] = useState<Template | null>(template);
  const [ratio, setOwnRatio] = useState<string>("auto");
  if (template && template !== shown) {
    setShown(template);
    setOwnRatio(template.ratio);
  }

  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        finalFocus={inputRef}
        className="grid max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl md:grid-cols-[1.1fr_1fr]"
      >
        {shown && (
          <>
            <div
              style={{ backgroundColor: shown.tint }}
              className="flex items-center justify-center overflow-hidden max-md:max-h-64"
            >
              <img
                src={tileSrc(shown.id)}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <DialogTitle className="text-xl font-medium">
                {shown.title}
              </DialogTitle>
              <DialogDescription className="text-foreground/80 text-sm leading-[1.375rem]">
                {shown.prompt}
              </DialogDescription>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Aspect ratio
                </span>
                <Menu>
                  <MenuTrigger className={cn(textButton, field, "h-8 px-3")}>
                    <RatioGlyph
                      shape={
                        RATIOS.find((entry) => entry.value === ratio)?.shape ??
                        "1 / 1"
                      }
                    />
                    {RATIOS.find((entry) => entry.value === ratio)?.label}
                  </MenuTrigger>
                  <MenuPopup align="end">
                    <RatioChoices value={ratio} onValueChange={setOwnRatio} />
                  </MenuPopup>
                </Menu>
              </div>
              <button
                type="button"
                onClick={() => {
                  aui.composer.setText(shown.prompt);
                  setRatio(ratio);
                  onClose();
                }}
                className={cn(inkButton, "mt-auto h-9 px-4 text-sm")}
              >
                Use this prompt
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* The rows of a ratio menu, in the message box and in the template dialog. */
export function RatioChoices({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <MenuRadioGroup value={value} onValueChange={onValueChange}>
      {RATIOS.map((entry) => (
        <MenuChoice key={entry.value} value={entry.value}>
          <RatioGlyph shape={entry.shape} />
          {entry.label}
        </MenuChoice>
      ))}
    </MenuRadioGroup>
  );
}

/* A small outline in the shape of the ratio it stands for. */
export function RatioGlyph({ shape }: { shape: string }) {
  const [width, height] = shape.split(" / ").map(Number);
  const wide = (width ?? 1) >= (height ?? 1);

  return (
    <span aria-hidden className="flex size-3.5 items-center justify-center">
      <span
        style={{ aspectRatio: shape }}
        className={cn(
          "rounded-[3px] border-[1.5px] border-current",
          wide ? "w-full" : "h-full",
        )}
      />
    </span>
  );
}

/* Prompts worth trying: one puts its words in the message box, ready to change or send. */
function Trending() {
  const aui = useAui();
  const { inputRef } = useOptions();

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {TRENDING.map((entry) => (
        <li key={entry.title}>
          <button
            type="button"
            onClick={() => {
              aui.composer.setText(entry.prompt);
              inputRef.current?.focus();
            }}
            className={cn(
              field,
              rSurface,
              "hover:bg-foreground/[0.07] flex h-full w-full flex-col gap-1 p-4 text-start transition-colors motion-reduce:transition-none",
              focusRing,
            )}
          >
            <span className="font-medium">{entry.title}</span>
            <span className="text-muted-foreground leading-[1.375rem]">
              {entry.prompt}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* Every picture made on this visit, newest first. */
function Mine() {
  const made = useMade();

  if (made.length === 0)
    return (
      <p className="text-muted-foreground py-10 text-center">
        Pictures you make show up here.
      </p>
    );

  return (
    <ul className={grid}>
      {made.map((picture) => (
        <li
          key={picture.id}
          className={cn(
            field,
            rSurface,
            "group relative aspect-square overflow-hidden",
          )}
        >
          <img
            src={picture.src}
            alt={picture.prompt}
            className="size-full object-cover"
          />
          <Tip label="Download">
            <a
              href={picture.src}
              download="picture.webp"
              className={cn(
                iconButton,
                rItem,
                "bg-background/90 text-foreground hover:bg-background absolute end-2 top-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
              )}
            >
              <Icon icon={Download01Icon} />
            </a>
          </Tip>
        </li>
      ))}
    </ul>
  );
}
