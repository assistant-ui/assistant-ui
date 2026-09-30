import { CalendarIcon, SearchIcon, WrenchIcon } from "lucide-react";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";
import { createDirectiveText } from "@assistant-ui/ui/components/assistant-ui/elements/directive-text.aui.tsx";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";

const DirectiveText = createDirectiveText(unstable_defaultDirectiveFormatter, {
  iconMap: { tool: WrenchIcon, search: SearchIcon, calendar: CalendarIcon },
});

export default defineSections([
  {
    id: "directive-text",
    title: "Directive text",
    category: "chat",
    notes:
      "directive-text.aui.tsx as the Text part: directives render as inline chips with icons by type.",
    render: () => (
      <SeededMessages
        messages={[
          {
            role: "user",
            content:
              "Use :tool[Get Weather]{name=get_weather} to check today's forecast in Tokyo.",
          },
          {
            role: "user",
            content:
              "Ask :search[Search]{name=search} for recent updates, then add them to :calendar[Calendar]{name=calendar}.",
          },
        ]}
        components={{ Text: DirectiveText }}
      />
    ),
  },
]);
