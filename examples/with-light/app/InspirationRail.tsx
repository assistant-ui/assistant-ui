"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function InspirationRail({ messages }: { messages: Message[] }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSummarize() {
    setLoading(true);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Summarizing the failure");
      }

      setSummary(data.summary);
    } catch (error) {
      console.error(error);
      setSummary("Summarization failed; please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="inspiration-rail" aria-label="Extension area">
      <p className="section-label">Your idea</p>

      <button
        className="summary-button"
        onClick={handleSummarize}
        disabled={loading || messages.length === 0}
      >
        {loading ? "Summarizing......" : "Summarize the current conversation."}
      </button>

      <div className="summary-card">
        {summary ? (
          <p>{summary}</p>
        ) : (
          <p className="empty-text">
            After clicking the button, the AI ​​summary will be displayed here.
          </p>
        )}
      </div>
    </aside>
  );
}
