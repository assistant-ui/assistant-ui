"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-streamdown";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { HoverCard } from "radix-ui";
import { useCopyToClipboard } from "@assistant-ui/ui/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import {
  trackXuluxDownload,
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";

export type OpenInData = {
  title: string;
  downloadUrl?: string;
  prompt?: string;
};

function isValidOpenInUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.trim().length === 0) return false;
  if (url.includes("<") || url.includes(">")) return false;
  if (/from-tool-result|placeholder|<downloadurl/i.test(url)) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toAbsoluteDownloadUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).href;
}

function getDocsAppendix(): string {
  const docsIndexUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/llms.txt`
      : "https://www.assistant-ui.com/llms.txt";

  return (
    `Before implementing, read ${docsIndexUrl} to discover relevant documentation pages. ` +
    "Traverse the index and read the specific pages you need (installation, architecture, runtimes, components) so your setup matches current assistant-ui APIs. " +
    "Use the assistant-ui CLI for scaffolding — do not manually create projects with create-next-app."
  );
}

function buildPrompt(data: OpenInData): string {
  const sections: string[] = [];

  if (data.prompt?.trim()) sections.push(data.prompt.trim());

  const downloadUrl = isValidOpenInUrl(data.downloadUrl)
    ? data.downloadUrl
    : undefined;
  if (downloadUrl) {
    sections.push(`Download: ${toAbsoluteDownloadUrl(downloadUrl)}`);
  }

  sections.push(getDocsAppendix());

  return sections.join("\n\n");
}

function ClaudeLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z"
      />
    </svg>
  );
}

function CodexLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
      />
    </svg>
  );
}

function CursorLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function ConductorLogo() {
  return (
    <svg viewBox="0 0 115 174" className="size-3.5 fill-current" aria-hidden>
      <path d="M4.57422 63.6992H22.373V37.251H4.57422C3.58785 37.2511 2.78711 38.0517 2.78711 39.0381V61.9121C2.78725 62.8984 3.58794 63.6991 4.57422 63.6992Z" />
      <path d="M36.5977 63.6992H18.7988V37.251H36.5977C37.584 37.2511 38.3848 38.0517 38.3848 39.0381V61.9121C38.3846 62.8984 37.5839 63.6991 36.5977 63.6992Z" />
      <path d="M4.57422 100.297H22.373V73.8486H4.57422C3.58785 73.8488 2.78711 74.6493 2.78711 75.6357V98.5098C2.78725 99.496 3.58794 100.297 4.57422 100.297Z" />
      <path d="M36.5977 100.297H18.7988V73.8486H36.5977C37.584 73.8488 38.3848 74.6493 38.3848 75.6357V98.5098C38.3846 99.496 37.5839 100.297 36.5977 100.297Z" />
      <path d="M4.57422 136.896H22.373V110.447H4.57422C3.58785 110.447 2.78711 111.248 2.78711 112.234V135.108C2.78725 136.095 3.58794 136.895 4.57422 136.896Z" />
      <path d="M36.5977 136.896H18.7988V110.447H36.5977C37.584 110.447 38.3848 111.248 38.3848 112.234V135.108C38.3846 136.095 37.5839 136.895 36.5977 136.896Z" />
      <path d="M22.873 173.493H40.6719V147.045H22.873C21.8867 147.045 21.0859 147.846 21.0859 148.832V171.706C21.0861 172.692 21.8868 173.493 22.873 173.493Z" />
      <path d="M37.0967 173.493V147.045H58.9707V173.493H37.0967Z" />
      <path d="M55.3955 173.493V147.045H77.2695V173.493H55.3955Z" />
      <path d="M91.4941 173.493H73.6953V147.045H91.4941C92.4805 147.045 93.2812 147.846 93.2812 148.832V171.706C93.2811 172.692 92.4804 173.493 91.4941 173.493Z" />
      <path d="M77.7695 136.896H95.5684V110.447H77.7695C76.7832 110.447 75.9824 111.248 75.9824 112.234V135.108C75.9826 136.095 76.7833 136.895 77.7695 136.896Z" />
      <path d="M109.793 136.896H91.9941V110.447H109.793C110.779 110.447 111.58 111.248 111.58 112.234V135.108C111.58 136.095 110.779 136.895 109.793 136.896Z" />
      <path d="M22.873 27.1006H40.6719V0.652344H22.873C21.8867 0.652488 21.0859 1.45305 21.0859 2.43945V25.3135C21.0861 26.2998 21.8868 27.1004 22.873 27.1006Z" />
      <path d="M37.0967 27.1006V0.652344H58.9707V27.1006H37.0967Z" />
      <path d="M55.3955 27.1006V0.652344H77.2695V27.1006H55.3955Z" />
      <path d="M73.6963 27.1006V0.652344H95.5703V27.1006H73.6963Z" />
      <path d="M109.793 27.1006H91.9941V0.652344H109.793C110.779 0.652488 111.58 1.45305 111.58 2.43945V25.3135C111.58 26.2998 110.779 27.1004 109.793 27.1006Z" />
      <path d="M77.7695 63.6992H95.5684V37.251H77.7695C76.7832 37.2511 75.9824 38.0517 75.9824 39.0381V61.9121C75.9826 62.8984 76.7833 63.6991 77.7695 63.6992Z" />
      <path d="M109.793 63.6992H91.9941V37.251H109.793C110.779 37.2511 111.58 38.0517 111.58 39.0381V61.9121C111.58 62.8984 110.779 63.6991 109.793 63.6992Z" />
    </svg>
  );
}

function ChatGPTLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function VSCodeLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M16.2 2.5 7.4 10.6 3.2 7.4 1.5 8.2v7.6l1.7.8 4.2-3.2 8.8 8.1 5.3-2.2V4.7l-5.3-2.2ZM4 10.5l2 1.5-2 1.5v-3Zm4.2 1.5 7-5.3v10.6l-7-5.3Zm10.3 5.4-1.5.6V6l1.5.6v10.8Z" />
    </svg>
  );
}

const PLATFORM_LOGOS = [
  { id: "claude", Logo: ClaudeLogo },
  { id: "codex", Logo: CodexLogo },
  { id: "vscode", Logo: VSCodeLogo },
  { id: "cursor", Logo: CursorLogo },
  { id: "conductor", Logo: ConductorLogo },
  { id: "chatgpt", Logo: ChatGPTLogo },
] as const;

export function OpenInCard({
  title,
  downloadUrl,
  prompt: agentPrompt,
}: OpenInData) {
  const analyticsCtx = useXuluxAnalytics();
  const prompt = buildPrompt({
    title,
    ...(downloadUrl ? { downloadUrl } : {}),
    ...(agentPrompt ? { prompt: agentPrompt } : {}),
  });
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const validDownloadUrl = isValidOpenInUrl(downloadUrl)
    ? downloadUrl
    : undefined;
  const hasDownload = Boolean(validDownloadUrl);

  return (
    <div className="border-border bg-muted/30 my-4 rounded-lg border px-4 py-3 text-sm shadow-sm">
      {/* Row 1: headline + decorative logos */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="text-foreground text-[13px] font-semibold">
          Continue in your coding agent
        </span>
        <span className="bg-border/70 h-4 w-px shrink-0" aria-hidden />
        <span className="flex items-center gap-2">
          {PLATFORM_LOGOS.map(({ id, Logo }) => (
            <span
              key={id}
              className="text-muted-foreground/50 inline-flex"
              aria-hidden
            >
              <Logo />
            </span>
          ))}
        </span>
      </div>

      {/* Row 2: actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {hasDownload && (
          <>
            <a
              href={toAbsoluteDownloadUrl(validDownloadUrl!)}
              download
              aria-label="Download starter"
              onClick={() =>
                trackXuluxDownload(analyticsCtx, {
                  surface: "open_in_card",
                  download_type: "demo",
                })
              }
              className="border-border bg-background hover:bg-muted inline-flex size-8 items-center justify-center rounded-md border transition-colors"
            >
              <DownloadIcon className="size-4" />
            </a>
            <span className="text-muted-foreground/70 text-xs">or</span>
          </>
        )}
        <HoverCard.Root openDelay={150} closeDelay={150}>
          <HoverCard.Trigger asChild>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(prompt);
                analytics.xulux.converted(
                  withXuluxContext(analyticsCtx, {
                    action: "copy_prompt",
                    surface: "open_in_card",
                  }),
                );
              }}
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-xs font-medium transition-colors"
              aria-describedby="xulux-open-in-prompt-preview"
            >
              {isCopied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              {isCopied ? "Copied!" : "Copy prompt"}
            </button>
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content
              id="xulux-open-in-prompt-preview"
              role="tooltip"
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="border-border bg-popover text-popover-foreground z-[2147483647] w-[min(24rem,calc(100vw-2rem))] rounded-lg border p-3 text-xs shadow-lg"
            >
              <div className="text-muted-foreground mb-2 font-medium">
                Prompt preview
              </div>
              <pre className="max-h-56 overflow-auto font-mono leading-normal break-words whitespace-pre-wrap">
                {prompt}
              </pre>
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
      </div>
    </div>
  );
}

export function OpenInSyntaxHighlighter({ code }: SyntaxHighlighterProps) {
  let data: OpenInData;
  try {
    data = JSON.parse(code) as OpenInData;
  } catch {
    return null;
  }
  if (!data.title) return null;
  const downloadUrl = isValidOpenInUrl(data.downloadUrl)
    ? data.downloadUrl
    : undefined;
  return (
    <OpenInCard
      title={data.title}
      {...(downloadUrl ? { downloadUrl } : {})}
      {...(data.prompt ? { prompt: data.prompt } : {})}
    />
  );
}
