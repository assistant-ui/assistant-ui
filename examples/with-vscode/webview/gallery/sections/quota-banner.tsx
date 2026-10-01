import { QuotaBanner } from "@assistant-ui/ui/components/assistant-ui/elements/quota-banner.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const QUOTA = {
  limit: 50,
  unit: "messages",
  resetsIn: "3h 12m",
  upgradeLabel: "Upgrade",
};

export default defineSections([
  {
    id: "quota-banner",
    title: "Quota banner",
    category: "agents",
    notes: "Plenty left, nearly out, and exhausted with an upgrade action.",
    render: () => (
      <States>
        <State label="32 of 50">
          <QuotaBanner {...QUOTA} used={32} />
        </State>
        <State label="47 of 50">
          <QuotaBanner {...QUOTA} used={47} onUpgrade={noop} />
        </State>
        <State label="50 of 50">
          <QuotaBanner {...QUOTA} used={50} onUpgrade={noop} />
        </State>
      </States>
    ),
  },
]);
