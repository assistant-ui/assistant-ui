"use client";

import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { useAui } from "@assistant-ui/react";
import { ImageGallery } from "@/components/assistant-ui/elements/image-gallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ORIENTATIONS,
  TEMPLATES,
  shapeOf,
  tileSrc,
  useMade,
  useOptions,
  type Template,
} from "./state";
import {
  Menu,
  MenuChoice,
  MenuPopup,
  MenuRadioGroup,
  MenuTrigger,
  RatioGlyph,
  field,
  focusRing,
  inkButton,
  rSurface,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* Gallery: what a new chat shows until a picture is asked for                */
/* -------------------------------------------------------------------------- */

const TABS = [
  { value: "templates", label: "Templates" },
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
 * A template up close: its picture, its prompt, and the orientation to make
 * it in. Using it writes the prompt in the message box, to send as it is or
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
  const { setSetting, inputRef } = useOptions();
  // The last template stays drawn while the dialog closes.
  const [shown, setShown] = useState<Template | null>(template);
  const [orientation, setOrientation] = useState<string>("auto");
  if (template && template !== shown) {
    setShown(template);
    setOrientation(template.ratio);
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
                  Orientation
                </span>
                <Menu>
                  <MenuTrigger className={cn(textButton, field, "h-8 px-3")}>
                    <RatioGlyph shape={shapeOf(orientation)} />
                    {
                      ORIENTATIONS.find((entry) => entry.value === orientation)
                        ?.label
                    }
                  </MenuTrigger>
                  <MenuPopup align="end">
                    <MenuRadioGroup
                      value={orientation}
                      onValueChange={setOrientation}
                    >
                      {ORIENTATIONS.map((entry) => (
                        <MenuChoice key={entry.value} value={entry.value}>
                          {entry.shape && <RatioGlyph shape={entry.shape} />}
                          {entry.label}
                        </MenuChoice>
                      ))}
                    </MenuRadioGroup>
                  </MenuPopup>
                </Menu>
              </div>
              <button
                type="button"
                onClick={() => {
                  aui.composer.setText(shown.prompt);
                  setSetting("orientation", orientation);
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

/* Every picture made on this visit, newest first, with one full-screen view to move through them. */
function Mine() {
  const made = useMade();

  if (made.length === 0)
    return (
      <p className="text-muted-foreground py-10 text-center">
        Pictures you make show up here.
      </p>
    );

  return (
    <ImageGallery
      images={made.map((picture) => ({
        id: picture.id,
        src: picture.src,
        alt: picture.prompt,
        caption: picture.prompt,
      }))}
      maxVisible={made.length}
      className="max-w-none *:gap-3 *:@2xl:grid-cols-4 *:@5xl:grid-cols-5"
    />
  );
}
