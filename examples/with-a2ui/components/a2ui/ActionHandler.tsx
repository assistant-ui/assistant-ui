"use client";

import { useCallback } from "react";
import { useA2ui } from "@assistant-ui/react-a2ui";
import type { A2uiAction, A2uiServerMessage } from "@assistant-ui/react-a2ui";

function handleRestaurantAction(
  action: A2uiAction,
  processMessage: (msg: A2uiServerMessage) => void,
) {
  const label =
    typeof action.context["label"] === "string" ? action.context["label"] : "";
  processMessage({
    type: "updateComponents",
    surfaceId: "restaurants",
    components: [
      {
        type: "Card",
        id: "detail-card",
        props: { title: label, subtitle: "Restaurant Details" },
      },
      {
        type: "Text",
        id: "detail-info",
        props: { value: `${action.context["detail"] ?? "Great restaurant"}` },
      },
      { type: "Divider", id: "detail-divider" },
      {
        type: "Row",
        id: "detail-hours",
        props: { label: "Hours", detail: "11:00 AM - 10:00 PM", price: "" },
      },
      {
        type: "Row",
        id: "detail-phone",
        props: { label: "Phone", detail: "(555) 123-4567", price: "" },
      },
      { type: "Divider", id: "reserve-divider" },
      {
        type: "TextField",
        id: "reserve-name",
        props: { label: "Your Name", placeholder: "Enter your name" },
      },
      {
        type: "TextField",
        id: "reserve-party",
        props: { label: "Party Size", placeholder: "Number of guests" },
      },
      {
        type: "Button",
        id: "reserve-btn",
        props: { label: "Reserve a Table", variant: "primary" },
      },
      {
        type: "Button",
        id: "back-btn",
        props: { label: "Back to Results", variant: "default" },
      },
    ],
  });
}

function handleQuizAction(
  action: A2uiAction,
  processMessage: (msg: A2uiServerMessage) => void,
) {
  const optionId = action.sourceComponentId;
  const selectedIndex = parseInt(optionId.replace("opt-", ""), 10);
  const isCorrect = selectedIndex === 1;

  processMessage({
    type: "updateComponents",
    surfaceId: "quiz",
    components: [
      {
        type: "Card",
        id: "quiz-result",
        props: {
          title: isCorrect ? "Correct!" : "Not quite!",
          subtitle: isCorrect
            ? "Great job!"
            : "The correct answer was the second option",
        },
      },
      { type: "Divider", id: "quiz-divider" },
      {
        type: "Text",
        id: "quiz-score",
        props: { value: `Score: ${isCorrect ? 1 : 0} / 1` },
      },
      {
        type: "Button",
        id: "quiz-again",
        props: { label: "Play Again", variant: "primary" },
      },
    ],
  });
}

function handleTaskAction(
  action: A2uiAction,
  processMessage: (msg: A2uiServerMessage) => void,
) {
  const taskId = action.sourceComponentId;
  const currentDetail =
    typeof action.context["label"] === "string" ? action.context["label"] : "";
  const statusCycle: Record<string, string> = {
    "To Do": "In Progress",
    "In Progress": "Done",
    Done: "To Do",
  };
  const currentStatus =
    typeof action.context["detail"] === "string"
      ? action.context["detail"]
      : "To Do";
  const newStatus = statusCycle[currentStatus] ?? "To Do";

  processMessage({
    type: "updateDataModel",
    surfaceId: "tasks",
    path: `/task/${taskId}/status`,
    value: newStatus,
  });

  // We don't have the full task list here, so show a confirmation
  processMessage({
    type: "updateComponents",
    surfaceId: "tasks",
    components: [
      {
        type: "Card",
        id: "task-updated",
        props: {
          title: "Task Updated",
          subtitle: `"${currentDetail}" moved to ${newStatus}`,
        },
      },
      {
        type: "Button",
        id: "task-ok",
        props: { label: "OK", variant: "primary" },
      },
    ],
  });
}

export function useActionHandler() {
  const { processMessage } = useA2ui();

  return useCallback(
    (action: A2uiAction) => {
      if (action.surfaceId === "restaurants") {
        if (action.sourceComponentId === "back-btn") {
          // Signal to re-show restaurants - but we don't have original data
          // Just dismiss and let user ask again
          processMessage({ type: "deleteSurface", surfaceId: "restaurants" });
          return;
        }
        if (action.sourceComponentId === "reserve-btn") {
          processMessage({
            type: "updateComponents",
            surfaceId: "restaurants",
            components: [
              {
                type: "Card",
                id: "confirmed",
                props: {
                  title: "Reservation Confirmed!",
                  subtitle: "You're all set",
                },
              },
              {
                type: "Text",
                id: "confirm-msg",
                props: { value: "You'll receive a confirmation shortly." },
              },
            ],
          });
          return;
        }
        handleRestaurantAction(action, processMessage);
        return;
      }

      if (action.surfaceId === "quiz") {
        if (action.sourceComponentId === "quiz-again") {
          processMessage({ type: "deleteSurface", surfaceId: "quiz" });
          return;
        }
        handleQuizAction(action, processMessage);
        return;
      }

      if (action.surfaceId === "recipe") {
        // Recipe steps/ingredients are display-only, no actions needed
        return;
      }

      if (action.surfaceId === "tasks") {
        if (action.sourceComponentId === "task-ok") {
          processMessage({ type: "deleteSurface", surfaceId: "tasks" });
          return;
        }
        handleTaskAction(action, processMessage);
        return;
      }
    },
    [processMessage],
  );
}
