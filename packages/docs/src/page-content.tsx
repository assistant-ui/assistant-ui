"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTreeContext } from "fumadocs-ui/contexts/tree";
import { useTOCItems } from "fumadocs-ui/components/toc";
import {
  Check,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { ClaudeIcon, McpIcon, OpenAIIcon } from "./action-icons";

import { getEditUrl, getPageNeighbors } from "./navigation";
import type { createDocsLayout } from "./next";

type PageLink = getPageNeighbors.Link;

const documentSubscribers = new Set<() => void>();
let documentObserver: MutationObserver | undefined;

const subscribeToDocument = (onChange: () => void) => {
  documentSubscribers.add(onChange);
  if (!documentObserver) {
    documentObserver = new MutationObserver(() => {
      for (const subscriber of documentSubscribers) subscriber();
    });
    documentObserver.observe(document.body, { childList: true, subtree: true });
  }
  return () => {
    documentSubscribers.delete(onChange);
    if (documentSubscribers.size === 0) {
      documentObserver?.disconnect();
      documentObserver = undefined;
    }
  };
};

const useDocumentElement = (selector: string | null) =>
  useSyncExternalStore(
    subscribeToDocument,
    () => (selector ? document.querySelector<HTMLElement>(selector) : null),
    () => null,
  );

const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

const PageActionLabel = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <span className="aui-docs-action-label">
    <span>{title}</span>
    <span>{description}</span>
  </span>
);

const DocsPageControls = ({
  previous,
  next,
  title,
  pathname,
  markdownUrl,
  siteName,
  editUrl,
  mcpUrl,
}: {
  previous: PageLink | undefined;
  next: PageLink | undefined;
  title: string;
  pathname: string;
  markdownUrl: string;
  siteName: string;
  editUrl: string | undefined;
  mcpUrl: string | undefined;
}) => {
  const toc = useTOCItems();
  // These portal hosts are supplied by Farming Labs 0.2.120 and Fumadocs UI 16.17.1.
  const headerHost = useDocumentElement("#nd-page .fd-generated-page-header");
  const tocHost = useDocumentElement(toc.length > 0 ? "#nd-toc" : null);
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getOrigin,
    getServerOrigin,
  );
  const markdown = useRef<Promise<string> | null>(null);
  const githubUrl = editUrl?.replaceAll("{path}", pathname);
  const publishedUrl = `${origin}${markdownUrl}`;
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(`Read ${publishedUrl} (the ${siteName} documentation page "${title}") so I can ask questions about it.`)}`;

  const loadMarkdown = () => {
    markdown.current ??= fetch(markdownUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this page");
        return response.text();
      })
      .catch((error: unknown) => {
        markdown.current = null;
        throw error;
      });
    return markdown.current;
  };

  const copy = async (kind: "page" | "mcp") => {
    setCopying(true);
    try {
      const text =
        kind === "page"
          ? await loadMarkdown()
          : new URL(mcpUrl ?? "", window.location.origin).href;
      await navigator.clipboard.writeText(text);
      setMessage(kind === "page" ? "Page copied" : "MCP server URL copied");
    } catch {
      setMessage("Could not copy. Please try again.");
    } finally {
      setCopying(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <>
      {headerHost &&
        createPortal(
          <nav
            className="aui-docs-page-controls not-prose"
            aria-label="Page controls"
          >
            {previous ? (
              <Link
                href={previous.url}
                className="aui-docs-pager-button"
                aria-label="Previous page"
                title="Previous page"
              >
                <ChevronLeft aria-hidden="true" />
              </Link>
            ) : (
              <button
                className="aui-docs-pager-button"
                aria-label="Previous page"
                disabled
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            {next ? (
              <Link
                href={next.url}
                className="aui-docs-pager-button"
                aria-label="Next page"
                title="Next page"
              >
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : (
              <button
                className="aui-docs-pager-button"
                aria-label="Next page"
                disabled
              >
                <ChevronRight aria-hidden="true" />
              </button>
            )}
            <DropdownMenu.Root
              onOpenChange={(open) => {
                if (open) void loadMarkdown().catch(() => {});
              }}
            >
              <DropdownMenu.Trigger
                className="aui-docs-pager-button"
                aria-label="More page actions"
              >
                <MoreHorizontal aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="aui-docs-actions-menu"
                  align="end"
                  sideOffset={4}
                  collisionPadding={16}
                >
                  <DropdownMenu.Item
                    className="aui-docs-actions-menu-item"
                    disabled={copying}
                    onSelect={() => void copy("page")}
                  >
                    <Copy aria-hidden="true" />
                    <PageActionLabel
                      title={copying ? "Copying..." : "Copy page"}
                      description="Markdown, ready to paste into an LLM"
                    />
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="aui-docs-actions-menu-item"
                    asChild
                  >
                    <a
                      href={markdownUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <FileText aria-hidden="true" />
                      <PageActionLabel
                        title="View as Markdown"
                        description="This page as plain text"
                      />
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="aui-docs-actions-menu-item"
                    asChild
                  >
                    <a
                      href={claudeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <ClaudeIcon />
                      <PageActionLabel
                        title="Open in Claude"
                        description="Ask Claude about this page"
                      />
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="aui-docs-actions-menu-item"
                    asChild
                  >
                    <a
                      href="https://chatgpt.com/codex/"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <OpenAIIcon />
                      <PageActionLabel
                        title="Open in Codex"
                        description="Open Codex in ChatGPT"
                      />
                    </a>
                  </DropdownMenu.Item>
                  {mcpUrl && (
                    <>
                      <DropdownMenu.Separator className="aui-docs-actions-menu-separator" />
                      <DropdownMenu.Item
                        className="aui-docs-actions-menu-item"
                        onSelect={() => void copy("mcp")}
                      >
                        <McpIcon />
                        <PageActionLabel
                          title="Copy MCP server URL"
                          description="Use these docs from any MCP client"
                        />
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>,
          headerHost,
        )}
      {tocHost &&
        createPortal(
          <div className="aui-docs-toc-actions not-prose">
            <button
              type="button"
              onClick={() => void copy("page")}
              disabled={copying}
            >
              <Copy aria-hidden="true" />
              {copying ? "Copying..." : "Copy page"}
            </button>
            <a href={markdownUrl} target="_blank" rel="noreferrer noopener">
              <FileText aria-hidden="true" />
              View as Markdown
            </a>
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noreferrer noopener">
                <Pencil aria-hidden="true" />
                Edit on GitHub
              </a>
            )}
          </div>,
          tocHost,
        )}
      <output className="aui-docs-action-status" aria-live="polite">
        {message && (
          <span>
            {message.startsWith("Could not") ? (
              <CircleAlert aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {message}
          </span>
        )}
      </output>
    </>
  );
};

export const DocsPageContent = ({
  children,
  name,
  github,
  editUrl,
  mcpUrl,
  footer,
}: {
  children: ReactNode;
  name: string;
  github: getEditUrl.Options | undefined;
  editUrl: string | undefined;
  mcpUrl: string | undefined;
  footer: createDocsLayout.Options["footer"];
}) => {
  const pathname = usePathname().replace(/\/$/, "");
  const { root } = useTreeContext();
  const { previous, next, current } = getPageNeighbors(root.children, pathname);
  const title = current?.name;
  const pageUrl = new URL(current?.url ?? pathname, "https://docs.local");
  const markdownUrl = `${pathname}.md${pageUrl.search}`;

  return (
    <div className="aui-docs-page-content">
      <DocsPageControls
        key={markdownUrl}
        pathname={pathname}
        markdownUrl={markdownUrl}
        title={typeof title === "string" ? title : name}
        siteName={name}
        editUrl={editUrl ?? getEditUrl(pathname, github)}
        mcpUrl={mcpUrl}
        previous={previous}
        next={next}
      />
      <div className="aui-docs-page-body">{children}</div>
      {(previous || next) && (
        <nav
          className="aui-docs-page-navigation not-prose"
          aria-label="Page navigation"
        >
          {previous ? (
            <Link href={previous.url} rel="prev">
              <ChevronLeft aria-hidden="true" />
              <span>
                {previous.section && (
                  <span className="aui-docs-page-section">
                    {previous.section} /{" "}
                  </span>
                )}
                {previous.name}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.url} rel="next">
              <span>
                {next.section && (
                  <span className="aui-docs-page-section">
                    {next.section} /{" "}
                  </span>
                )}
                {next.name}
              </span>
              <ChevronRight aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {footer && (
        <footer className="aui-docs-legal-footer not-prose">{footer}</footer>
      )}
    </div>
  );
};
