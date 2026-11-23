import { describe, expect, it } from "vitest";
import { createTooltipNoteFilter } from "./shadcn-output";

// The `docs` field of shadcn's tooltip item, as `shadcn add` prints it (logger.info, cyan).
const NOTE =
  'The `tooltip` component has been added. Remember to wrap your app with the `TooltipProvider` component.\n\n```tsx title="app/layout.tsx"\nimport { TooltipProvider } from "@/components/ui/tooltip"\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <TooltipProvider>{children}</TooltipProvider>\n      </body>\n    </html>\n  )\n}\n```\n';
const cyan = (text: string) => `\u001b[36m${text}\u001b[39m`;

const BEFORE =
  "✔ Checking registry.\n✔ Installing dependencies.\n✔ Created 12 files:\n  - components/ui/tooltip.tsx\n";
const SHADCN_ADD_OUTPUT = `${BEFORE}${cyan(NOTE)}\n`;

const run = (chunks: string[]) => {
  const filter = createTooltipNoteFilter();
  return chunks.map((chunk) => filter.write(chunk)).join("") + filter.end();
};

describe("createTooltipNoteFilter", () => {
  it("drops shadcn's TooltipProvider note and its code block, and keeps the rest", () => {
    expect(run([SHADCN_ADD_OUTPUT])).toBe(BEFORE);
    expect(run([`${SHADCN_ADD_OUTPUT}Done.\n`])).toBe(`${BEFORE}Done.\n`);
  });

  it("gives the same output however the stream is split", () => {
    const output = `${SHADCN_ADD_OUTPUT}Done.\n`;
    expect(run([...output])).toBe(`${BEFORE}Done.\n`);
    for (let at = 1; at < output.length; at++)
      expect(run([output.slice(0, at), output.slice(at)])).toBe(
        `${BEFORE}Done.\n`,
      );
  });

  it("passes a prompt without a trailing newline through right away", () => {
    const filter = createTooltipNoteFilter();
    expect(filter.write("? Would you like to overwrite? › (y/N)")).toBe(
      "? Would you like to overwrite? › (y/N)",
    );
    expect(filter.write(" y\n")).toBe(" y\n");
  });

  it("holds a partial line that could start the note until it can tell", () => {
    const filter = createTooltipNoteFilter();
    expect(filter.write("The `tool")).toBe("");
    expect(filter.write("box` is ready.\n")).toBe("The `toolbox` is ready.\n");
    expect(filter.write("The `tooltip`")).toBe("");
    expect(filter.end()).toBe("The `tooltip`");
  });

  it("keeps the output that follows a note without a code block", () => {
    expect(
      run([
        `${cyan("The `tooltip` component has been added. Remember to wrap your app with the `TooltipProvider` component.")}\n\nDone.\n`,
      ]),
    ).toBe("Done.\n");
  });

  it("leaves output without the note unchanged", () => {
    const output = `${BEFORE}\n\`\`\`tsx\ncode\n\`\`\`\n\n`;
    expect(run([output])).toBe(output);
  });
});
