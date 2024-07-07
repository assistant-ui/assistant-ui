"use client";

import type { FC, ReactNode } from "react";
import { useThreadEmpty } from "@assistant-ui/react"; 

export type ThreadPrimitiveNotEmptyProps = {
  children: ReactNode;
};

export const ThreadPrimitiveNotEmpty: FC<ThreadPrimitiveNotEmptyProps> = ({
  children,
}) => {
  const empty = useThreadEmpty(); // Use the same hook to check if the thread is empty
  return !empty ? children : null; // Render children if not empty, otherwise render null
};

ThreadPrimitiveNotEmpty.displayName = "ThreadPrimitive.NotEmpty";