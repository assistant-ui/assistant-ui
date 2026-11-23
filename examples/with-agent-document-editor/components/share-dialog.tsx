"use client";

import { useAuiState } from "@assistant-ui/react";
import { CheckIcon, CopyIcon, DownloadIcon, Share2Icon } from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCommentsState,
  useDocumentState,
} from "@/components/workspace-context";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { initialComments, type DocumentState } from "@/lib/document-state";
import {
  documentToMarkdown,
  markdownFileName,
  readShareLink,
  shareLink,
} from "@/lib/share";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const link = window.document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function ShareOptions({
  copyLink,
}: {
  copyLink: RefObject<HTMLButtonElement | null>;
}) {
  const [document] = useDocumentState();
  const link = shareLink(document, window.location.href);
  const linkCopy = useCopyToClipboard();
  const markdownCopy = useCopyToClipboard();

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link}
            aria-label="Link to this document"
            onFocus={(event) => event.target.select()}
            className="text-muted-foreground font-mono text-xs md:text-xs"
          />
          <Button
            ref={copyLink}
            className="shrink-0"
            onClick={() => linkCopy.copyToClipboard(link)}
          >
            {linkCopy.isCopied ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            <span aria-live="polite">
              {linkCopy.isCopied ? "Copied" : "Copy link"}
            </span>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Whoever opens the link gets their own copy. Comments and the chat stay
          with you.
        </p>
      </div>
      <div className="border-foreground/10 flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-medium">Take the text with you</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              markdownCopy.copyToClipboard(documentToMarkdown(document))
            }
          >
            {markdownCopy.isCopied ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            <span aria-live="polite">
              {markdownCopy.isCopied ? "Copied" : "Copy as Markdown"}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              download(markdownFileName(document), documentToMarkdown(document))
            }
          >
            <DownloadIcon data-icon="inline-start" />
            Download Markdown
          </Button>
        </div>
      </div>
    </>
  );
}

export function ShareDialog() {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const copyLink = useRef<HTMLButtonElement>(null);

  return (
    <Dialog>
      <DialogTrigger
        // The document is only whole between the assistant's edits.
        render={<Button variant="outline" disabled={isRunning} />}
      >
        <Share2Icon data-icon="inline-start" />
        <span className="max-sm:sr-only">Share</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" initialFocus={copyLink}>
        <DialogHeader>
          <DialogTitle>Share this document</DialogTitle>
          <DialogDescription>
            The link holds the document itself, so nothing is uploaded and no
            account is needed.
          </DialogDescription>
        </DialogHeader>
        <ShareOptions copyLink={copyLink} />
      </DialogContent>
    </Dialog>
  );
}

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

// Rewriting the address in place does not announce itself, so the listeners
// above are told.
const dropShareLink = () => {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", pathname + search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
};

/** Offers the document a share link holds, when the page is opened from one. */
export function SharedDocument() {
  const [, { setState: setDocument }] = useDocumentState();
  const [, { setState: setComments }] = useCommentsState();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const shared = useMemo(() => readShareLink(hash), [hash]);
  // The link leaves the address as soon as it is answered. This is what the
  // dialog goes on showing while it closes.
  const [answered, setAnswered] = useState<DocumentState>();
  const offered = shared ?? answered;

  const answer = (accept: boolean) => {
    if (!shared) return;
    if (accept) {
      setDocument(shared);
      setComments(initialComments);
    }
    setAnswered(shared);
    dropShareLink();
  };

  return (
    <Dialog
      open={shared !== undefined}
      onOpenChange={(open) => {
        if (!open) answer(false);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Open the shared document?</DialogTitle>
          <DialogDescription>
            This link holds a document called “{offered?.title || "Untitled"}”.
            Opening it replaces the document and the comments saved in this
            browser.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => answer(false)}>
            Keep mine
          </Button>
          <Button disabled={isRunning} onClick={() => answer(true)}>
            Open it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
