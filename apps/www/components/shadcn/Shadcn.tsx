import { ArchiveIcon, EditIcon, MenuIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import remarkGfm from "remark-gfm";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import icon from "@/public/favicon/favicon.svg";
import type { TooltipContentProps } from "@radix-ui/react-tooltip";
import Image from "next/image";
import { type FC } from "react";
import { makeMarkdownText, Thread } from "@assistant-ui/react-ui";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ModelPicker } from "./ModelPicker";
import { useSwitchToNewThread } from "@assistant-ui/react";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { makePrismAsyncSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";

const MarkdownText = makeMarkdownText({
  remarkPlugins: [remarkGfm],
  components: {
    SyntaxHighlighter: makePrismAsyncSyntaxHighlighter({
      style: coldarkDark,
      customStyle: {
        margin: 0,
        backgroundColor: "black",
      },
    }),
  },
});

type ButtonWithTooltipProps = ButtonProps & {
  tooltip: string;
  side?: TooltipContentProps["side"];
};

const ButtonWithTooltip: FC<ButtonWithTooltipProps> = ({
  children,
  tooltip,
  side = "top",
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...rest}>
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

const TopLeft: FC = () => {
  const switchToNewThread = useSwitchToNewThread();

  return (
    <ButtonWithTooltip
      onClick={switchToNewThread}
      variant="ghost"
      className="flex w-full justify-between px-3"
      tooltip="New Chat"
      side="right"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Image src={icon} alt="logo" className="inline size-4" />
        <span>assistant-ui</span>
      </div>

      <EditIcon className="size-4" />
    </ButtonWithTooltip>
  );
};

const MainLeft: FC = () => {
  return (
    <nav className="flex flex-col items-stretch gap-1 text-sm font-medium">
      <Link
        href="#"
        className="bg-muted text-primary hover:text-primary flex items-center gap-3 rounded-lg px-3 py-2 transition-all"
      >
        New Chat
        <ButtonWithTooltip
          variant={"ghost"}
          className="hover:text-foreground/60 ml-auto h-auto p-0"
          tooltip="Archive"
        >
          <ArchiveIcon className="size-4" />
        </ButtonWithTooltip>
      </Link>
    </nav>
  );
};

const LeftBarSheet: FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <MenuIcon className="size-4" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <div className="mt-6 flex flex-col gap-1">
          <TopLeft />
          <MainLeft />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Header: FC = () => {
  return (
    <header className="flex gap-2">
      <LeftBarSheet />
      <ModelPicker />
      <ButtonWithTooltip
        variant="outline"
        size="icon"
        tooltip="Share"
        side="bottom"
        className="ml-auto shrink-0"
      >
        <ShareIcon className="size-4" />
      </ButtonWithTooltip>
    </header>
  );
};

export const Shadcn = () => {
  const sideStyle = "bg-muted/40 px-3 py-2";
  const topStyle = "border-b";
  const leftStyle = "border-r hidden md:block";

  return (
    <div className="grid h-full w-full grid-flow-col grid-rows-[auto_1fr] md:grid-cols-[250px_1fr]">
      <div className={cn(sideStyle, leftStyle, topStyle)}>
        <TopLeft />
      </div>
      <div className={cn(sideStyle, leftStyle)}>
        <MainLeft />
      </div>
      <div className={cn(sideStyle, topStyle)}>
        <Header />
      </div>
      <div className="bg-background overflow-hidden">
        <Thread
          assistantMessage={{ components: { Text: MarkdownText } }}
          welcome={{
            suggestions: [
              {
                text: "Write a poem",
                prompt: "Write me a poem about the weather",
              },
              {
                text: "What is assistant-ui?",
                prompt:
                  "Psst: assistant-ui is a react component library for AI chatbots.\n\nWhat is assistant-ui?",
              },
            ],
          }}
        />
      </div>
    </div>
  );
};
