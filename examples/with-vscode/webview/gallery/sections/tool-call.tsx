import { useState } from "react";
import { ToolCall } from "@assistant-ui/ui/components/assistant-ui/elements/tool-call.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const CALL = {
  label: "Searched the docs",
  activeLabel: "Searching the docs",
  query: "draft persistence",
  request: '{"query": "draft persistence", "limit": 3}',
  result: "3 matches, best hit /docs/runtime/drafts",
};

function InteractiveToolCall() {
  const [open, setOpen] = useState(false);
  return (
    <ToolCall {...CALL} running={false} open={open} onOpenChange={setOpen} />
  );
}

export default defineSections([
  {
    id: "tool-call",
    title: "Tool call",
    category: "agents",
    notes: "A settled call; the header toggles the request and result.",
    render: () => <InteractiveToolCall />,
  },
  {
    id: "tool-call-states",
    title: "Tool call states",
    category: "agents",
    notes: "Running, settled and closed, settled and open, and a long query.",
    render: () => (
      <States>
        <State label="running">
          <ToolCall {...CALL} running open={false} onOpenChange={noop} />
        </State>
        <State label="done, closed">
          <ToolCall
            {...CALL}
            running={false}
            open={false}
            onOpenChange={noop}
          />
        </State>
        <State label="done, open">
          <ToolCall {...CALL} running={false} open onOpenChange={noop} />
        </State>
        <State label="long query and result">
          <ToolCall
            label="Fetched the page"
            activeLabel="Fetching the page"
            query="https://code.visualstudio.com/api/extension-guides/webview#content-security-policy"
            request='{"url": "https://code.visualstudio.com/api/extension-guides/webview#content-security-policy", "format": "markdown"}'
            result="Webviews should set a Content-Security-Policy meta tag that only allows the resources the webview needs: default-src 'none'; img-src ${webview.cspSource}; script-src 'nonce-…'; style-src ${webview.cspSource}."
            running={false}
            open
            onOpenChange={noop}
          />
        </State>
      </States>
    ),
  },
]);
