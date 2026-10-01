import {
  QuoteReply,
  type QuoteAction,
} from "@assistant-ui/ui/components/assistant-ui/elements/quote-reply.tsx";
import { defineSections } from "../types";

const ACTIONS: readonly QuoteAction[] = [
  { key: "quote", label: "Quote", icon: "quote" },
  { key: "explain", label: "Explain", icon: "explain" },
  { key: "rewrite", label: "Rewrite", icon: "rewrite" },
];

const SELECTION = "the converter drops parts with no text";

const props = {
  before: "The regression happens because ",
  selection: SELECTION,
  after: ", so an empty assistant turn never reaches the thread.",
  actions: ACTIONS,
  onAction: () => {},
};

export default defineSections([
  {
    id: "quote-reply",
    title: "Quote reply (toolbar)",
    category: "chat",
    notes:
      "quote-reply.tsx (standalone) with its three-action toolbar over the selection.",
    render: () => <QuoteReply {...props} toolbarVisible />,
  },
  {
    id: "quote-reply-quoted",
    title: "Quote reply (quoted)",
    category: "chat",
    render: () => (
      <QuoteReply {...props} toolbarVisible={false} quoted={SELECTION} />
    ),
  },
]);
