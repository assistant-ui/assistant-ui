"use client";

import React, { type FC } from "react";
import {
  Thread,
  Message,
  Composer,
  ActionBar,
  BranchPicker,
  EditBar,
} from "@assistant-ui/react";
import Link from "next/link";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  EditIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizonalIcon,
  ShareIcon,
} from "lucide-react";
import icon from "../../assets/icon.svg";
import Image from "next/image";
import { SelectTrigger } from "@radix-ui/react-select";
import anthropic from "../../assets/providers/anthropic.svg";
import openai from "../../assets/providers/openai.svg";
import fireworks from "../../assets/providers/fireworks.svg";
import google from "../../assets/providers/google.svg";
import huggingface from "../../assets/providers/huggingface.svg";
import meta from "../../assets/providers/meta.svg";
import mistral from "../../assets/providers/mistral.svg";

const models = [
  {
    name: "GPT 3.5 Turbo",
    value: "gpt-3.5-turbo",
    icon: openai,
  },
  {
    name: "Gemini 1.5 Pro",
    value: "gemini-1.5-pro",
    icon: google,
  },
  {
    name: "Gemma 7b",
    value: "gemma-7b",
    icon: google,
  },
  {
    name: "Claude 3 Haiku",
    value: "claude-3-haiku",
    icon: anthropic,
  },
  {
    name: "Llama 3 8b",
    value: "llama-3-8b",
    icon: meta,
  },
  {
    name: "Llama 3 70b",
    value: "llama-3-70b",
    icon: meta,
  },
  {
    name: "Codellama 70b",
    value: "codellama-70b",
    icon: meta,
  },
  {
    name: "Mistral 7b",
    value: "mistral-7b",
    icon: mistral,
  },
  {
    name: "Mixtral 8x7b",
    value: "mixtral-8x7b",
    icon: mistral,
  },
  {
    name: "DBRX",
    value: "dbrx",
    icon: fireworks,
  },
  {
    name: "Firefunction V1",
    value: "firefunction-v1",
    icon: fireworks,
  },
  {
    name: "Firellava 13b",
    value: "firellava-13b",
    icon: fireworks,
  },
  {
    name: "Hermes 2 Pro",
    value: "hermes-2-pro",
    icon: huggingface,
  },
  {
    name: "Neural Hermes",
    value: "neuralhermes",
    icon: huggingface,
  },
];

export const Shadcn: FC = () => {
  return (
    <div className="flex h-full">
      <div className="flex w-[250px] flex-col border-r pt-0.5">
        <div className="flex items-center p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-grow justify-between"
          >
            <p className="flex items-center gap-1 font-bold">
              <Image
                src={icon}
                alt="logo"
                className="inline size-4 dark:invert"
              />{" "}
              assistant-ui
            </p>
            <EditIcon className="size-4" />
          </Button>
        </div>

        <div className="border-b" />

        <div className="flex flex-col gap-1 p-2">
          <Link
            // key={index}
            href="#"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "dark:bg-muted dark:hover:bg-muted dark:hover:text-white dark:text-white",
              "justify-start",
            )}
          >
            {/* <link.icon className="mr-2 h-4 w-4" /> */}
            New Chat
          </Link>
          <Link
            // key={index}
            href="#"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              // "dark:bg-muted dark:hover:bg-muted dark:hover:text-white dark:text-white",
              "justify-start",
            )}
          >
            {/* <link.icon className="mr-2 h-4 w-4" /> */}
            Is Pineapple Pizza any good?
          </Link>
        </div>
      </div>
      <div className="flex flex-grow flex-col pt-0.5">
        <div className="flex items-center justify-between p-2">
          <ModelPicker />
          <Button variant="ghost" size="sm">
            <ShareIcon className="size-4" />
          </Button>
        </div>
        <div className="border-b" />
        <ShadcnThread />
      </div>
    </div>
  );
};

const ModelPicker: FC = () => {
  return (
    <Select defaultValue={models[0]?.value ?? ""}>
      <SelectTrigger className="h-8 w-[200px] px-3 font-bold text-sm" asChild>
        <Button variant="ghost" size="sm" className="justify-start">
          <SelectValue />
        </Button>
      </SelectTrigger>
      <SelectContent className="">
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            <span className="flex items-center gap-2">
              <Image
                src={model.icon}
                alt={model.name}
                className="inline size-4"
              />
              {model.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ShadcnThread: FC = () => {
  return (
    <Thread.Root className="flex h-full flex-col overflow-clip">
      <Thread.Viewport className="flex flex-grow justify-center overflow-y-scroll pt-16">
        <div className="flex max-w-2xl flex-grow flex-col">
          <Thread.Empty>
            <div className="flex flex-grow flex-col items-center justify-center">
              <Avatar>
                <AvatarFallback>C</AvatarFallback>
              </Avatar>
              <p className="mt-4 text-xl">How can I help you today?</p>
            </div>
          </Thread.Empty>

          <Thread.Messages components={{ Message: ChatMessage }} />
        </div>
      </Thread.Viewport>

      <div className="flex justify-center">
        <Composer.Root className="mb-4 flex max-w-2xl flex-grow items-end rounded-lg border bg-background p-0.5">
          <Composer.Input
            placeholder="Message ChatGPT..."
            className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none placeholder:text-white/50"
          />
          <Thread.If busy={false}>
            <Composer.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-md bg-black font-bold text-2xl disabled:opacity-10">
              <SendHorizonalIcon className="size-4 text-white" />
            </Composer.Send>
          </Thread.If>
          <Thread.If busy>
            <Composer.Stop className="m-3.5 flex size-5 items-center justify-center rounded-full border-2 border-white font-bold text-white">
              <div className="size-2 rounded-[1px] bg-white" />
            </Composer.Stop>
          </Thread.If>
        </Composer.Root>
      </div>
    </Thread.Root>
  );
};

const ChatMessage: FC = () => {
  return (
    <Message.Root className="mb-12 flex gap-3">
      <Avatar>
        <AvatarFallback>
          <Message.If user>Y</Message.If>
          <Message.If assistant>A</Message.If>
        </AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">
          <Message.If user>You</Message.If>
          <Message.If assistant>Assistant</Message.If>
        </p>

        <Message.If editing={false}>
          <p className="whitespace-pre-line text-[#111]">
            <Message.Content />
          </p>
        </Message.If>

        <Message.If editing>
          <Message.EditableContent className="flex h-8 w-full resize-none bg-transparent outline-none" />
        </Message.If>

        <Message.If editing={false}>
          <ActionBar.Root className="mt-2 flex items-center gap-3">
            <Message.If hasBranches>
              <BranchPicker.Root className="inline-flex text-[#b4b4b4] text-xs">
                <BranchPicker.Previous className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronLeftIcon className="size-4" />
                </BranchPicker.Previous>
                <BranchPicker.Number /> / <BranchPicker.Count />
                <BranchPicker.Next className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                  <ChevronRightIcon className="size-4" />
                </BranchPicker.Next>
              </BranchPicker.Root>
            </Message.If>

            <Message.If assistant>
              <ActionBar.Reload className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <RefreshCwIcon className="size-4" />
              </ActionBar.Reload>
              <ActionBar.Copy className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <Message.If copied>
                  <CheckIcon className="size-4" />
                </Message.If>
                <Message.If copied={false}>
                  <ClipboardIcon className="size-4" />
                </Message.If>
              </ActionBar.Copy>
            </Message.If>

            <Message.If user>
              <ActionBar.Edit className="text-[#b4b4b4] hover:enabled:text-white disabled:opacity-50">
                <PencilIcon className="size-4" />
              </ActionBar.Edit>
            </Message.If>
          </ActionBar.Root>
        </Message.If>

        <Message.If editing>
          <EditBar.Root className="mt-2 flex items-center justify-center gap-3">
            <EditBar.Save className="rounded-lg bg-[#10a37e] px-3 py-2 text-sm text-white hover:bg-[#1a7f64]">
              Save & Submit
            </EditBar.Save>

            <EditBar.Cancel className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-800">
              Cancel
            </EditBar.Cancel>
          </EditBar.Root>
        </Message.If>
      </div>
    </Message.Root>
  );
};
