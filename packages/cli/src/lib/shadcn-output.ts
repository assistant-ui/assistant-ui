import { stripVTControlCharacters } from "node:util";

/**
 * The start of the note shadcn prints after adding its `tooltip` component
 * (the item's `docs` field), followed by a code block that wraps the root
 * layout in `TooltipProvider`. assistant-ui components that use tooltips
 * render their own `TooltipProvider`, so the note does not apply to them.
 */
const TOOLTIP_NOTE_START = "The `tooltip` component has been added.";
const TOOLTIP_NOTE_MARKER = "wrap your app with the `TooltipProvider`";

/** Removes text from a stream of output and passes the rest through. */
export interface OutputFilter {
  /** Returns the part of `chunk` that can be shown now. */
  write(chunk: string): string;
  /** Returns whatever is still held back when the stream ends. */
  end(): string;
}

/** Drops an escape sequence cut off at the end of `text`, such as `ESC[3`. */
const dropCutEscape = (text: string) => {
  const escape = text.lastIndexOf("\u001b");
  return escape !== -1 && /^(\[[0-9;?]*)?$/.test(text.slice(escape + 1))
    ? text.slice(0, escape)
    : text;
};

/** Plain text of a line, also when it ends in the middle of an escape sequence. */
const plain = (text: string) =>
  stripVTControlCharacters(dropCutEscape(text)).trim();

/** True when a partial line could still turn out to be the note. */
const mayStartNote = (text: string) =>
  TOOLTIP_NOTE_START.startsWith(text) || text.startsWith(TOOLTIP_NOTE_START);

/**
 * Drops shadcn's TooltipProvider note and its code block from the output of
 * `shadcn add`, so it does not tell people to change a layout that needs no
 * change. Everything else passes through as it arrives, including prompts
 * without a trailing newline; only a partial line that could be the start of
 * the note waits for the rest of its line.
 */
export function createTooltipNoteFilter(): OutputFilter {
  // "note": dropping the note and blank lines up to its code block;
  // "code": inside the code block; "after": one blank line after it.
  let state: "pass" | "note" | "code" | "after" = "pass";
  let held = "";
  let lineStarted = false;

  const onLine = (line: string): string => {
    const text = plain(line);
    if (state === "pass") {
      if (text.includes(TOOLTIP_NOTE_MARKER)) {
        state = "note";
        return "";
      }
      return line;
    }
    if (state === "note") {
      if (text.startsWith("```")) state = "code";
      else if (text !== "") {
        state = "pass";
        return onLine(line);
      }
      return "";
    }
    if (state === "code") {
      if (text.startsWith("```")) state = "after";
      return "";
    }
    state = "pass";
    return text === "" ? "" : onLine(line);
  };

  return {
    write(chunk) {
      let out = "";
      let rest = chunk;
      for (;;) {
        const newline = rest.indexOf("\n");
        if (newline === -1) break;
        const segment = rest.slice(0, newline + 1);
        rest = rest.slice(newline + 1);
        if (lineStarted) {
          out += segment;
          lineStarted = false;
        } else {
          out += onLine(held + segment);
          held = "";
        }
      }
      if (rest === "") return out;
      if (lineStarted) return out + rest;
      held += rest;
      if (state === "after" && plain(held) !== "") state = "pass";
      if (state === "pass" && !mayStartNote(plain(held))) {
        out += held;
        held = "";
        lineStarted = true;
      }
      return out;
    },
    end() {
      const rest = state === "pass" ? held : "";
      held = "";
      return rest;
    },
  };
}
