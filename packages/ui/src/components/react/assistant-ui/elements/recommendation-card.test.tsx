import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecommendationCard } from "./recommendation-card";

afterEach(cleanup);

describe("RecommendationCard", () => {
  it.each(["Accept", "Alternatives"])(
    "focuses the receipt after the focused %s button is replaced",
    (button) => {
      const props = {
        question: "Apply the change?",
        confidenceLabel: "High confidence",
        acceptedLabel: "Accepted",
        children: "This change updates the answer.",
      };
      const { rerender } = render(
        <RecommendationCard state="idle" {...props} />,
      );
      const answer = screen.getByRole("button", { name: button });
      answer.focus();
      fireEvent.click(answer);

      rerender(<RecommendationCard state="accepted" {...props} />);

      expect(document.activeElement).toBe(screen.getByText("Accepted"));
    },
  );
});
