"use client";

import {
  ActionBarPrimitive,
  AssistantIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  Mic,
  Moon,
  Paperclip,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState, type FC, type SVGProps } from "react";
import { useShallow } from "zustand/shallow";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

export const Grok: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-[#fdfdfd] px-4 dark:bg-[#141414]">
      <ThreadPrimitive.Empty>
        <div className="flex h-full flex-col items-center justify-center">
          <GrokLogo className="mb-6 h-10 text-[#0d0d0d] dark:text-white" />
          <Composer />
        </div>
      </ThreadPrimitive.Empty>

      <AssistantIf condition={(s) => s.thread.isEmpty === false}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll pt-16">
          <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
          <p className="mx-auto w-full max-w-3xl p-2 text-center text-[#9a9a9a] text-xs">
            Grok can make mistakes. Verify important information.
          </p>
        </ThreadPrimitive.Viewport>
        <Composer />
      </AssistantIf>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => {
  const isEmpty = useAssistantState((s) => s.composer.isEmpty);
  const isRunning = useAssistantState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root
      className="group/composer mx-auto mb-3 w-full max-w-3xl"
      data-empty={isEmpty}
      data-running={isRunning}
    >
      <div className="overflow-hidden rounded-4xl bg-[#f8f8f8] shadow-xs ring-1 ring-[#e5e5e5] ring-inset transition-shadow focus-within:ring-[#d0d0d0] dark:bg-[#212121] dark:ring-[#2a2a2a] dark:focus-within:ring-[#3a3a3a]">
        <AssistantIf condition={(s) => s.composer.attachments.length > 0}>
          <div className="flex flex-row flex-wrap gap-2 px-4 pt-3">
            <ComposerPrimitive.Attachments
              components={{ Attachment: GrokAttachment }}
            />
          </div>
        </AssistantIf>

        <div className="flex items-end gap-1 p-2">
          <ComposerPrimitive.AddAttachment className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0d0d0d] transition-colors hover:bg-[#f0f0f0] dark:text-white dark:hover:bg-[#2a2a2a]">
            <Paperclip width={18} height={18} />
          </ComposerPrimitive.AddAttachment>

          <ComposerPrimitive.Input
            placeholder="What do you want to know?"
            minRows={1}
            className="my-2 h-6 max-h-[400px] min-w-0 flex-1 resize-none bg-transparent text-[#0d0d0d] text-base leading-6 outline-none placeholder:text-[#9a9a9a] dark:text-white dark:placeholder:text-[#6b6b6b]"
          />

          <button
            type="button"
            className="mb-0.5 flex h-9 shrink-0 items-center gap-2 rounded-full px-2.5 text-[#0d0d0d] hover:bg-[#f0f0f0] dark:text-white dark:hover:bg-[#2a2a2a]"
          >
            <Moon width={18} height={18} className="shrink-0" />
            <div className="flex items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-300 group-data-[empty=false]/composer:max-w-0 group-data-[empty=true]/composer:max-w-24 group-data-[empty=false]/composer:opacity-0 group-data-[empty=true]/composer:opacity-100">
              <span className="whitespace-nowrap font-semibold text-sm">
                Grok 4.1
              </span>
              <ChevronDownIcon width={16} height={16} className="shrink-0" />
            </div>
          </button>

          <div className="relative mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d]">
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=false]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=false]/composer:opacity-0 group-data-[running=true]/composer:opacity-0"
              aria-label="Voice mode"
            >
              <Mic width={18} height={18} />
            </button>

            <ComposerPrimitive.Send className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[empty=true]/composer:scale-0 group-data-[running=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 group-data-[running=true]/composer:opacity-0">
              <ArrowUpIcon width={18} height={18} />
            </ComposerPrimitive.Send>

            <ComposerPrimitive.Cancel className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0">
              <Square width={14} height={14} fill="currentColor" />
            </ComposerPrimitive.Cancel>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative mx-auto mb-2 flex w-full max-w-3xl flex-col pb-0.5">
      <AssistantIf condition={(s) => s.message.role === "user"}>
        <div className="flex flex-col items-end">
          <div className="relative max-w-[90%] rounded-3xl rounded-br-lg border border-[#e5e5e5] bg-[#f0f0f0] px-4 py-3 text-[#0d0d0d] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white">
            <div className="prose prose-sm dark:prose-invert wrap-break-word">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
          <div className="mt-1 flex h-8 items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="flex items-center gap-0.5">
              <ActionBarPrimitive.Edit className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <Pencil1Icon width={16} height={16} />
              </ActionBarPrimitive.Edit>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AssistantIf>

      <AssistantIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col items-start">
          <div className="w-full max-w-none">
            <div className="prose prose-sm wrap-break-word dark:prose-invert prose-li:my-1 prose-ol:my-1 prose-p:my-2 prose-ul:my-1 text-[#0d0d0d] dark:text-[#e5e5e5]">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>
          </div>
          <div className="mt-1 flex h-8 w-full items-center justify-start gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Root className="-ml-2 flex items-center gap-0.5">
              <ActionBarPrimitive.Reload className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ReloadIcon width={16} height={16} />
              </ActionBarPrimitive.Reload>
              <ActionBarPrimitive.Copy className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <CopyIcon width={16} height={16} />
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.FeedbackPositive className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsUp width={16} height={16} />
              </ActionBarPrimitive.FeedbackPositive>
              <ActionBarPrimitive.FeedbackNegative className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] transition-colors hover:bg-[#e5e5e5] hover:text-[#0d0d0d] dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a] dark:hover:text-white">
                <ThumbsDown width={16} height={16} />
              </ActionBarPrimitive.FeedbackNegative>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </AssistantIf>
    </MessagePrimitive.Root>
  );
};

const useAttachmentSrc = () => {
  const { file, src } = useAssistantState(
    useShallow(({ attachment }): { file?: File; src?: string } => {
      if (attachment.type !== "image") return {};
      if (attachment.file) return { file: attachment.file };
      const src = attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  const [fileSrc, setFileSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setFileSrc(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFileSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return fileSrc ?? src;
};

const GrokAttachment: FC = () => {
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f0f0f0] p-0.5 transition-colors hover:border-[#d0d0d0] dark:border-[#2a2a2a] dark:bg-[#252525] dark:hover:border-[#3a3a3a]">
        <AssistantIf
          condition={({ attachment }) => attachment.type === "image"}
        >
          {src ? (
            <img
              className="h-full w-12 rounded-[9px] object-cover"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-[#e5e5e5] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AssistantIf>
        <AssistantIf
          condition={({ attachment }) => attachment.type !== "image"}
        >
          <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-[#e5e5e5] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AssistantIf>
      </div>
      <AttachmentPrimitive.Remove className="absolute -top-1.5 -right-1.5 flex h-6 w-6 scale-50 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b] opacity-0 transition-all hover:bg-[#f5f5f5] hover:text-[#0d0d0d] group-hover/attachment:scale-100 group-hover/attachment:opacity-100 dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#9a9a9a] dark:hover:bg-[#252525] dark:hover:text-white">
        <Cross2Icon width={14} height={14} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};

const GrokLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 1024 400" fill="none">
    <path
      d="M878.447 292.85V108.548H907.572V230.18L969.173 159.399H1004.48L949.069 220.058L1005 292.85H970.204L924.902 230.304L907.572 230.18V292.85H878.447Z"
      fill="currentColor"
    />
    <path
      d="M790.12 295.947C746.819 295.947 723.364 265.23 723.364 225.995C723.364 186.502 746.819 156.043 790.12 156.043C833.679 156.043 856.876 186.502 856.876 225.995C856.876 265.23 833.679 295.947 790.12 295.947ZM753.778 225.995C753.778 256.454 770.274 271.683 790.12 271.683C810.224 271.683 826.462 256.454 826.462 225.995C826.462 195.536 810.224 180.049 790.12 180.049C770.274 180.049 753.778 195.536 753.778 225.995Z"
      fill="currentColor"
    />
    <path
      d="M642.304 292.85V180.565L666.789 159.399H718.854V184.179H671.429V292.85H642.304Z"
      fill="currentColor"
    />
    <path
      d="M530.938 296.258C475.424 296.258 442.325 255.938 442.325 200.957C442.325 145.46 476.606 104.16 532.021 104.16C575.323 104.16 607.025 126.359 614.5 167.659H581.251C576.353 144.169 556.765 131.005 532.021 131.005C492.07 131.005 474.544 165.594 474.544 200.957C474.544 236.32 492.07 270.651 532.021 270.651C570.168 270.651 586.921 243.031 588.21 220.058H530.732V193.331H617.593L617.451 207.305C617.451 259.231 596.295 296.258 530.938 296.258Z"
      fill="currentColor"
    />
    <path
      d="M163.591 251.367L288.916 158.716C295.06 154.174 303.842 155.946 306.769 163.001C322.178 200.209 315.294 244.924 284.638 275.625C253.982 306.326 211.328 313.059 172.34 297.724L129.75 317.472C190.837 359.287 265.016 348.946 311.369 302.492C348.137 265.67 359.524 215.479 348.877 170.217L348.973 170.314C333.533 103.822 352.769 77.2447 392.174 22.898C393.107 21.6094 394.04 20.3208 394.973 19L343.119 70.9306V70.7695L163.559 251.399"
      fill="currentColor"
    />
    <path
      d="M137.728 273.885C93.8835 231.941 101.443 167.028 138.854 129.594C166.518 101.889 211.842 90.5817 251.409 107.205L293.902 87.5535C286.246 82.0126 276.435 76.0528 265.176 71.8648C214.287 50.8929 153.362 61.3305 111.994 102.727C72.2025 142.577 59.6893 203.85 81.1773 256.135C97.229 295.211 70.9158 322.852 44.4097 350.75C35.0167 360.64 25.5916 370.53 18 381L137.696 273.917"
      fill="currentColor"
    />
  </svg>
);
