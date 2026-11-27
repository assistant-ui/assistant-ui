"use client";

import { useState } from "react";
import {
  MCP_EDITORS,
  MCP_LOCAL_PACKAGE,
  type McpEditor,
  type McpEditorId,
} from "@/lib/library/mcp-data";
import { LibraryCopyButton } from "./library-copy-button";
import { CommandLine, Step } from "./library-steps";
import { PillTabs, type PillTab } from "./pill-tabs";

const TABS: readonly PillTab<McpEditorId>[] = MCP_EDITORS.map(
  ({ id, label }) => ({ id, label }),
);

const mono = "font-mono text-xs [font-variant-ligatures:none]";

function Manual({ editor }: { editor: McpEditor }) {
  const { manual } = editor;

  if ("command" in manual) {
    return (
      <>
        <p className="text-muted-foreground text-sm">
          The command above runs this for you.
        </p>
        <CommandLine command={manual.command} />
      </>
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        The command above adds this to {editor.label}&apos;s config file.
      </p>
      <ul className="flex flex-col gap-1">
        {manual.files.map((file) => (
          <li
            key={file.path}
            className="flex flex-wrap items-baseline gap-x-2 text-sm"
          >
            <span className={`${mono} break-all`}>{file.path}</span>
            {file.where ? (
              <span className="text-muted-foreground">{file.where}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] relative">
        <pre
          tabIndex={0}
          className="focus-visible:ring-ring rounded-document overflow-x-auto p-4 pe-12 outline-none focus-visible:ring-2"
        >
          <code className={mono}>{manual.config}</code>
        </pre>
        <LibraryCopyButton
          text={manual.config}
          label="Copy config"
          className="absolute top-2 right-2"
        />
      </div>
    </>
  );
}

/** Pick an editor, then run one command; the same setup by hand sits beside it. */
export function McpConnect() {
  const [id, setId] = useState<McpEditorId>("cursor");
  const editor = MCP_EDITORS.find((entry) => entry.id === id) ?? MCP_EDITORS[0];
  if (!editor) return null;

  return (
    <section aria-labelledby="mcp-connect" className="pb-12">
      <h2 id="mcp-connect" className="sr-only">
        Connect your editor
      </h2>
      <PillTabs
        tabs={TABS}
        value={editor.id}
        onValueChange={setId}
        label="Your editor"
        className="mb-12"
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-10 lg:grid-cols-2">
        <ol className="flex flex-col">
          <Step number={1} title="Run the command">
            <CommandLine command={editor.command} />
            <p className="text-muted-foreground text-sm">
              {editor.transport === "hosted" ? (
                "It points the editor at the hosted server, so there is nothing to install or update."
              ) : (
                <>
                  {editor.label} only starts local servers, so it uses{" "}
                  <span className={mono}>{MCP_LOCAL_PACKAGE}</span>, which
                  passes every request to the hosted server.
                </>
              )}
            </p>
          </Step>
          <Step number={2} title={`Finish in ${editor.label}`}>
            <p className="text-muted-foreground text-sm">{editor.after}</p>
          </Step>
          <Step number={3} title="Ask for something">
            <p className="text-muted-foreground text-sm">
              Your agent now reads the docs while it works. Try “Add a chat
              interface with streaming support to my app”.
            </p>
          </Step>
        </ol>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-sm font-medium">By hand</h3>
          <Manual editor={editor} />
        </div>
      </div>
    </section>
  );
}
