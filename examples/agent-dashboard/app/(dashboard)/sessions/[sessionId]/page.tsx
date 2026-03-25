"use client";

import { use } from "react";
import { SessionDetail } from "@/components/detail/SessionDetail";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = use(params);
  return <SessionDetail sessionId={sessionId} />;
}
