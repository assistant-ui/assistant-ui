"use client";
import * as Avatar from "@radix-ui/react-avatar";
import React, { FC } from "react";

export const ChatEmpty: FC = () => {
  return (
    <div className="flex flex-grow flex-col items-center justify-center">
      <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-white">
        <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
      </Avatar.Root>
      <p className="mt-4 text-xl text-white">How can I help you today?</p>
    </div>
  );
};
