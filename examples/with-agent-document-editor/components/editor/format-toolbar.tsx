"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  BoldIcon,
  CodeIcon,
  HighlighterIcon,
  ItalicIcon,
  LinkIcon,
  MinusIcon,
  RedoIcon,
  StrikethroughIcon,
  TextQuoteIcon,
  UnderlineIcon,
  UndoIcon,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BlockIds } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import {
  insertDivider,
  LIST_STYLES,
  setLink,
  setTextStyle,
  useIsEditable,
  TEXT_STYLES,
  toggleList,
  useSelectionFormat,
} from "./editor-commands";

function ToolbarButton({
  active,
  className,
  ...props
}: ComponentProps<typeof TooltipIconButton> & { active?: boolean }) {
  return (
    <TooltipIconButton
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      {...props}
      className={cn(
        "text-muted-foreground hover:text-foreground size-7 shrink-0 [&_svg]:size-4",
        active && "bg-muted text-foreground",
        className,
      )}
    />
  );
}

const Divider = () => (
  <span aria-hidden className="bg-foreground/10 mx-1 h-4 w-px shrink-0" />
);

function LinkButton({ address }: { address: string | null }) {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // The popover hands focus back to its button when it closes, so the
  // document takes it once that has happened.
  const finish = (address: string | null) => {
    setLink(editor, address);
    setOpen(false);
    setTimeout(() => editor.focus(), 0);
  };

  const apply = (event: FormEvent) => {
    event.preventDefault();
    finish(draft);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(address ?? "");
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <ToolbarButton tooltip="Link" active={address !== null || open} />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <form onSubmit={apply} className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://example.com"
            aria-label="Link address"
            className="h-8"
          />
          {address !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => finish(null)}
            >
              Remove
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function FormatToolbar({ ids }: { ids: BlockIds }) {
  const [editor] = useLexicalComposerContext();
  const format = useSelectionFormat();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterUndo();
      unregisterRedo();
    };
  }, [editor]);

  const editable = useIsEditable();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="border-foreground/10 bg-background h-11 shrink-0 overflow-x-auto border-b px-3"
    >
      {/* A read-only editor still runs commands, so the buttons are turned
          off with it while the assistant writes. */}
      <fieldset
        disabled={!editable}
        className="flex h-full min-w-0 items-center gap-0.5"
      >
        <ToolbarButton
          tooltip="Undo"
          disabled={!canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Redo"
          disabled={!canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <RedoIcon />
        </ToolbarButton>
        <Divider />
        {TEXT_STYLES.filter(({ style }) => style !== "quote").map(
          ({ style, label, icon: Icon }) => (
            <ToolbarButton
              key={style}
              tooltip={label}
              active={format.block === style}
              onClick={() => setTextStyle(editor, style, ids)}
            >
              <Icon />
            </ToolbarButton>
          ),
        )}
        <Divider />
        <ToolbarButton
          tooltip="Bold"
          active={format.bold}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Italic"
          active={format.italic}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Underline"
          active={format.underline}
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
          }
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Strikethrough"
          active={format.strike}
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
          }
        >
          <StrikethroughIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Code"
          active={format.code}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        >
          <CodeIcon />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Highlight"
          active={format.highlight}
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "highlight")
          }
        >
          <HighlighterIcon />
        </ToolbarButton>
        <LinkButton address={format.link} />
        <Divider />
        {LIST_STYLES.map(({ style, label, icon: Icon }) => (
          <ToolbarButton
            key={style}
            tooltip={label}
            active={format.block === style}
            onClick={() => toggleList(editor, style)}
          >
            <Icon />
          </ToolbarButton>
        ))}
        <ToolbarButton
          tooltip="Quote"
          active={format.block === "quote"}
          onClick={() =>
            setTextStyle(
              editor,
              format.block === "quote" ? "paragraph" : "quote",
              ids,
            )
          }
        >
          <TextQuoteIcon />
        </ToolbarButton>
        <ToolbarButton tooltip="Divider" onClick={() => insertDivider(editor)}>
          <MinusIcon />
        </ToolbarButton>
      </fieldset>
    </div>
  );
}
