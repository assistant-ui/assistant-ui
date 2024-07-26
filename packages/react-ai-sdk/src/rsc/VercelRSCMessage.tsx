"use client";
import type { ReactNode } from "react";

export type VercelRSCMessage = {
  id?: string | undefined;
  role: "user" | "assistant";
  display: ReactNode;
  createdAt?: Date | undefined;
};
