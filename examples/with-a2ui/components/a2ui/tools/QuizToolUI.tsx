"use client";

import { useEffect, useRef } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useA2ui } from "@assistant-ui/react-a2ui";
import { dismissOtherSurfaces } from "./surface-utils";

type QuizResult = {
  topic: string;
  questions: { question: string; options: string[]; correct: number }[];
  currentQuestion: number;
  score: number;
  total: number;
};

export const QuizToolUI = makeAssistantToolUI<{ topic: string }, QuizResult>({
  toolName: "start_quiz",
  render: ({ result }) => {
    const { processMessage } = useA2ui();
    const created = useRef(false);

    useEffect(() => {
      if (!result || created.current) return;
      created.current = true;

      dismissOtherSurfaces(processMessage, "quiz");
      const q = result.questions[0];
      if (!q) return;

      processMessage({ type: "createSurface", surfaceId: "quiz" });
      processMessage({
        type: "updateComponents",
        surfaceId: "quiz",
        components: [
          {
            type: "Card",
            id: "quiz-card",
            props: {
              title: `${result.topic} Quiz`,
              subtitle: `Question 1 of ${result.total}`,
            },
          },
          { type: "Text", id: "quiz-question", props: { value: q.question } },
          ...q.options.map((opt, i) => ({
            type: "Button",
            id: `opt-${i}`,
            props: { label: opt, variant: "default" },
          })),
          { type: "Divider", id: "quiz-divider" },
          {
            type: "Text",
            id: "quiz-score",
            props: { value: `Score: ${result.score} / ${result.total}` },
          },
        ],
      });

      processMessage({
        type: "updateDataModel",
        surfaceId: "quiz",
        path: "/quiz/score",
        value: result.score,
      });
    }, [result, processMessage]);

    if (!result)
      return <p className="text-muted-foreground text-sm">Preparing quiz...</p>;
    return (
      <p className="text-muted-foreground text-sm">
        Started a {result.topic} quiz! Answer in the sidebar.
      </p>
    );
  },
});
