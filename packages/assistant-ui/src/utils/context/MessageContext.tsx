"use client";

import { Message } from "ai/react";
import { Dispatch, SetStateAction, createContext } from "react";

// TODO better message context

export const MessageContext = createContext<Message | null>(null);
export const IsEditingContext = createContext<
  [false | string, Dispatch<SetStateAction<false | string>>]
>([false, () => {}]);
