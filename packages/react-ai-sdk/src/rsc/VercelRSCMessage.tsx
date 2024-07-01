"use client";
import type { ReactNode } from "react";

export type VercelRSCMessage = {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
  createdAt?: Date | undefined;
};
