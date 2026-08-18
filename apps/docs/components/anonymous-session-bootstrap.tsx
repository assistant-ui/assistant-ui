"use client";

import { useEffect } from "react";
import { ensureAnonymousSession } from "@/lib/anonymous-session-client";

export function AnonymousSessionBootstrap() {
  useEffect(() => {
    void ensureAnonymousSession().catch(() => {});
  }, []);

  return null;
}
