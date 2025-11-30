"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Check, ChevronDown, FileText } from "lucide-react";

const BASE_URL = "https://assistant-ui.com" as const;
const ICON_SIZE = "size-4" as const;

// Initialize lazily to avoid SSR memory issues
let markdownCache: Map<string, string> | undefined;
function getMarkdownCache() {
  if (typeof window === "undefined") return new Map<string, string>();
  if (!markdownCache) {
    markdownCache = new Map<string, string>();
  }
  return markdownCache;
}

const GitHubSVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
));
GitHubSVG.displayName = "GitHubSVG";

const SciraSVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 910 934"
    fill="none"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path
      d="M647.664 197.775C569.13 189.049 525.5 145.419 516.774 66.8849C508.048 145.419 464.418 189.049 385.884 197.775C464.418 206.501 508.048 250.131 516.774 328.665C525.5 250.131 569.13 206.501 647.664 197.775Z"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinejoin="round"
    />
    <path
      d="M516.774 304.217C510.299 275.491 498.208 252.087 480.335 234.214C462.462 216.341 439.058 204.251 410.333 197.775C439.059 191.3 462.462 179.209 480.335 161.336C498.208 143.463 510.299 120.06 516.774 91.334C523.25 120.059 535.34 143.463 553.213 161.336C571.086 179.209 594.49 191.3 623.216 197.775C594.49 204.251 571.086 216.341 553.213 234.214C535.34 252.087 523.25 275.491 516.774 304.217Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinejoin="round"
    />
    <path
      d="M857.5 508.116C763.259 497.644 710.903 445.288 700.432 351.047C689.961 445.288 637.605 497.644 543.364 508.116C637.605 518.587 689.961 570.943 700.432 665.184C710.903 570.943 763.259 518.587 857.5 508.116Z"
      stroke="currentColor"
      strokeWidth="20"
      strokeLinejoin="round"
    />
    <path
      d="M760.632 764.337C720.719 814.616 669.835 855.1 611.872 882.692C553.91 910.285 490.404 924.255 426.213 923.533C362.022 922.812 298.846 907.419 241.518 878.531C184.19 849.643 134.228 808.026 95.4548 756.863C56.6815 705.7 30.1238 646.346 17.8129 583.343C5.50206 520.339 7.76432 455.354 24.4266 393.359C41.0889 331.364 71.7099 274.001 113.947 225.658C156.184 177.315 208.919 139.273 268.117 114.442"
      stroke="currentColor"
      strokeWidth="30"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
SciraSVG.displayName = "SciraSVG";

const OpenAISVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
));
OpenAISVG.displayName = "OpenAISVG";

const AnthropicSVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 46 32"
    fill="currentColor"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path d="M32.73 0h-6.945L38.45 32h6.945L32.73 0ZM12.665 0 0 32h7.082l2.59-6.72h13.25l2.59 6.72h7.082L19.929 0h-7.264Zm-.702 19.337 4.334-11.246 4.334 11.246h-8.668Z" />
  </svg>
));
AnthropicSVG.displayName = "AnthropicSVG";

const CursorSVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z" />
  </svg>
));
CursorSVG.displayName = "CursorSVG";

const T3SVG = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 258 199"
    fill="currentColor"
    className={ICON_SIZE}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M165.735 25.0701L188.947 0.972412H0.465994V25.0701H165.735Z"
    />
    <path d="M163.981 96.3239L254.022 3.68314L221.206 3.68295L145.617 80.7609L163.981 96.3239Z" />
    <path d="M233.658 131.418C233.658 155.075 214.48 174.254 190.823 174.254C171.715 174.254 155.513 161.738 150 144.439L146.625 133.848L127.329 153.143L129.092 157.336C139.215 181.421 163.034 198.354 190.823 198.354C227.791 198.354 257.759 168.386 257.759 131.418C257.759 106.937 244.399 85.7396 224.956 74.0905L220.395 71.3582L202.727 89.2528L210.788 93.5083C224.403 100.696 233.658 114.981 233.658 131.418Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M88.2625 192.669L88.2626 45.6459H64.1648L64.1648 192.669H88.2625Z"
    />
  </svg>
));
T3SVG.displayName = "T3SVG";

async function fetchMarkdown(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

function getButtonClasses() {
  return buttonVariants({
    variant: "secondary",
    size: "sm",
    className:
      "gap-1.5 text-xs [&_svg]:size-3 [&_svg]:text-fd-muted-foreground",
  });
}

export const CopyMarkdownButton = memo(function CopyMarkdownButton({
  markdownUrl,
}: {
  markdownUrl: string;
}) {
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cache = getMarkdownCache();
    if (cache.has(markdownUrl)) return;

    let cancelled = false;

    void (async () => {
      try {
        const content = await fetchMarkdown(markdownUrl);
        if (!cancelled) {
          cache.set(markdownUrl, content);
        }
      } catch {
        // Fail silently - will fetch on click if needed
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markdownUrl]);

  const handleCopy = useCallback(async () => {
    const cache = getMarkdownCache();
    let content = cache.get(markdownUrl);
    if (!content) {
      setLoading(true);
      try {
        content = await fetchMarkdown(markdownUrl);
        cache.set(markdownUrl, content);
      } catch (error) {
        console.error("Failed to copy markdown:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    }

    await navigator.clipboard.writeText(content);
  }, [markdownUrl]);

  const [checked, onClick] = useCopyButton(handleCopy);

  return (
    <>
      <button
        disabled={isLoading}
        className={getButtonClasses()}
        onClick={onClick}
        aria-label="Copy page content as markdown"
        aria-live="polite"
      >
        {checked ? (
          <Check className="fade-in-0 size-3 animate-in" />
        ) : (
          <Copy className="size-3" />
        )}
        Copy Markdown
      </button>
      {checked && (
        <span className="sr-only">Markdown content copied to clipboard</span>
      )}
    </>
  );
});

interface AIOption {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const AI_SERVICES = [
  {
    title: "Ask in Scira AI",
    baseUrl: "https://scira.ai/?q=",
    Icon: SciraSVG,
  },
  {
    title: "Ask in ChatGPT",
    baseUrl: "https://chatgpt.com/?q=",
    Icon: OpenAISVG,
  },
  {
    title: "Ask in Claude",
    baseUrl: "https://claude.ai/new?q=",
    Icon: AnthropicSVG,
  },
  {
    title: "Ask in Cursor",
    baseUrl: "https://cursor.com/link/prompt?text=",
    Icon: CursorSVG,
  },
  {
    title: "Ask in T3 Chat",
    baseUrl: "https://t3.chat/new?q=",
    Icon: T3SVG,
  },
] as const;

export const PageActionsDropdown = memo(function PageActionsDropdown({
  markdownUrl,
  githubUrl,
}: {
  markdownUrl: string;
  githubUrl: string;
}) {
  const [open, setOpen] = useState(false);

  const markdownPageUrl = useMemo(
    () => `${BASE_URL}${markdownUrl}`,
    [markdownUrl],
  );

  const aiOptions = useMemo((): AIOption[] => {
    const prompt = `Read ${BASE_URL}${markdownUrl}, I want to ask questions about it.`;
    const encodedPrompt = encodeURIComponent(prompt);

    return AI_SERVICES.map((service) => ({
      title: service.title,
      href: `${service.baseUrl}${encodedPrompt}`,
      icon: <service.Icon />,
    }));
  }, [markdownUrl]);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={getButtonClasses()}
        aria-label="Page actions menu"
      >
        Open in
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px] duration-100">
        <DropdownMenuItem asChild>
          <a
            href={markdownPageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5"
          >
            <FileText className={ICON_SIZE} />
            View as Markdown
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {aiOptions.map((option) => (
          <DropdownMenuItem key={option.title} asChild>
            <a
              href={option.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5"
            >
              {option.icon}
              {option.title}
            </a>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5"
          >
            <GitHubSVG />
            Open in GitHub
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
