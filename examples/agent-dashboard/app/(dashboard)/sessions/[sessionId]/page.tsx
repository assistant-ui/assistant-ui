"use client";

import { SessionDetail } from "@/components/detail/SessionDetail";

interface SessionDetailPageProps {
  params: { sessionId: string };
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = params;
  return <SessionDetail sessionId={sessionId} />;
}
