"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantShell,
  AssistantShellFooterItem,
} from "@/components/assistant-ui/assistant-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { ChevronsUpDownIcon, LogOutIcon, UserRoundIcon } from "lucide-react";

const AccountMenu = () => {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <AssistantShellFooterItem
            icon={
              <Avatar>
                <AvatarImage src={user?.imageUrl} alt="" />
                <AvatarFallback>{user?.firstName?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
            }
            label={user?.fullName ?? "Account"}
            description={user?.primaryEmailAddress?.emailAddress}
            trailing={<ChevronsUpDownIcon className="size-4" />}
          />
        }
      />
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem onClick={() => openUserProfile()}>
          <UserRoundIcon /> Manage account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Assistant = () => {
  const { getToken } = useAuth();

  const cloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        authToken: async () => {
          const token = await getToken({ template: "assistant-ui" });

          if (!token) throw new Error("Missing Clerk JWT");

          return token;
        },
      }),
    [getToken],
  );

  const runtime = useChatRuntime({
    cloud,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantShell sidebarFooter={<AccountMenu />}>
        <Thread />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
};
