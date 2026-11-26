import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import {
  CatalogBrowser,
  type CatalogDemo,
} from "@/components/pages/demos/catalog";
import type { DemoFile } from "@/components/pages/demos/demo-window";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { Highlight } from "@/components/shared/highlight";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Blocks built on assistant-ui, each a folder of a few files with a live preview.",
};

/**
 * Every demo is a folder in `components/demos` holding its component
 * (`<name>.tsx`), `page.tsx`, `data.json`, and a `layout.tsx` and
 * `<name>.css` only when it needs them. The Code tab lists them in this order.
 */
const FILE_ORDER = (name: string) => [
  `${name}.tsx`,
  "page.tsx",
  "layout.tsx",
  "data.json",
  `${name}.css`,
];

/** The server highlighter knows TSX and JSON; a stylesheet goes through the client one. */
async function highlight(file: string, source: string) {
  if (file.endsWith(".css")) return <Highlight code={source} language="css" />;
  const html = await highlightElementSource(
    source,
    file.endsWith(".json") ? "json" : "tsx",
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The folder the preview runs, so the tab and the preview cannot drift apart. */
async function readFolder(name: string): Promise<[DemoFile, ...DemoFile[]]> {
  "use cache";
  cacheLife("minutes");
  const folder = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "components/demos",
    name,
  );
  const present = new Set(await readdir(folder));
  const files = await Promise.all(
    FILE_ORDER(name)
      .filter((file) => present.has(file))
      .map(async (file) => {
        const source = (
          await readFile(path.join(folder, file), "utf8")
        ).trimEnd();
        return { name: file, code: await highlight(file, source) };
      }),
  );
  const [first, ...rest] = files;
  if (!first) throw new Error(`No demo files in components/demos/${name}`);
  return [first, ...rest];
}

function CatalogHeader() {
  return (
    <header className="mb-10 max-w-2xl md:mb-12">
      <h1 className={typePage}>Every demo, in one place.</h1>
      <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
        Blocks that run on this site. Try each one in place, and read its files.
      </p>
    </header>
  );
}

export default async function DemosPage() {
  const [images, chat] = await Promise.all([
    readFolder("images"),
    readFolder("chat"),
  ]);

  const catalog: CatalogDemo[] = [
    {
      id: "images",
      title: "Images",
      kind: "Block",
      tags: ["Tools", "Attachments"],
      description:
        "An image maker that turns a template or a message into a picture you edit beside the chat.",
      // The block sets its theme on the whole page, so it runs at its own address, in a frame.
      preview: (
        <LiveFrame
          src="/blocks/demos/images"
          title="Images"
          className="size-full rounded-none border-0"
        />
      ),
      files: images,
      docs: { href: "/blocks/images", label: "About the block" },
      full: "/blocks/demos/images",
    },
    {
      id: "chat",
      title: "Chat",
      kind: "Block",
      tags: ["Thread list", "Branching", "Attachments"],
      description:
        "A chat with its chats in a sidebar, replies that think first, and every version of a retried or edited message, on a script.",
      preview: (
        <LiveFrame
          src="/blocks/demos/chat"
          title="Chat"
          className="size-full rounded-none border-0"
        />
      ),
      files: chat,
      docs: {
        href: "/docs/runtimes/custom/local-runtime",
        label: "Swap the script for a model",
      },
      full: "/blocks/demos/chat",
    },
  ];

  return (
    <PageFrame pad="sub">
      <CatalogHeader />
      <CatalogBrowser demos={catalog} />
    </PageFrame>
  );
}
