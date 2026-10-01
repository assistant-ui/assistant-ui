import { NumberTicker } from "@assistant-ui/ui/components/assistant-ui/elements/number-ticker.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "number-ticker",
    title: "Number ticker",
    category: "content",
    notes: "A settled counter with its label.",
    render: () => <NumberTicker value={17776} label="tokens generated" />,
  },
]);
