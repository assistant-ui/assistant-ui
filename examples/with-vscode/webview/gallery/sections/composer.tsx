import { useState } from "react";
import {
  BookOpenIcon,
  GitBranchIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerAttachmentChip,
  ComposerAttachments,
  ComposerBar,
  ComposerCommandItem,
  ComposerContext,
  ComposerInput,
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  ComposerPersonItem,
  ComposerSend,
  ComposerToolbar,
  ComposerVoice,
  ComposerVoiceButton,
  applyMention,
  useMentionMatches,
  useSlashMatches,
  type ComposerAttachment,
  type ComposerCommand,
  type ComposerModel,
  type ComposerPerson,
} from "@assistant-ui/ui/components/assistant-ui/elements/composer.tsx";
import { defineSections } from "../types";

const COMMANDS: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
  { name: "branch", description: "Start a new branch", icon: GitBranchIcon },
  { name: "improve", description: "Suggest improvements", icon: SparklesIcon },
];

const PEOPLE: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
  { name: "Aiden", role: "agent" },
];

const MODELS: ComposerModel[] = [
  { name: "Fable 5.1", meta: "1M ctx" },
  { name: "Opus 5.5", meta: "1M ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

const ATTACHMENTS: ComposerAttachment[] = [
  { name: "screenshot.png", meta: "128 KB", state: "done", kind: "image" },
  { name: "vitest-run.log", meta: "38 KB", state: "done", kind: "text" },
];

function StandaloneComposer({
  initialValue = "",
  initialModelOpen = false,
  voice = false,
}: {
  initialValue?: string;
  initialModelOpen?: boolean;
  voice?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [model, setModel] = useState("Fable 5.1");
  const [modelOpen, setModelOpen] = useState(initialModelOpen);
  const [attachments, setAttachments] = useState(ATTACHMENTS);
  const slashMatches = useSlashMatches(value, COMMANDS);
  const mentionMatches = useMentionMatches(value, PEOPLE);
  const menuOpen =
    modelOpen || slashMatches.length > 0 || mentionMatches.length > 0;

  return (
    <div className="flex w-full flex-col">
      {/* The menus open upwards over this room. */}
      {menuOpen && <div aria-hidden className="h-44" />}
      <Composer className="max-w-none">
        <ComposerMenu open={slashMatches.length > 0}>
          {slashMatches.map((command, i) => (
            <ComposerCommandItem
              key={command.name}
              command={command}
              active={i === 0}
              onClick={() => setValue(`/${command.name} `)}
            />
          ))}
        </ComposerMenu>
        <ComposerMenu open={mentionMatches.length > 0}>
          {mentionMatches.map((person, i) => (
            <ComposerPersonItem
              key={person.name}
              person={person}
              active={i === 0}
              onClick={() => setValue(applyMention(value, person.name))}
            />
          ))}
        </ComposerMenu>
        <ComposerBar>
          {attachments.length > 0 && (
            <ComposerAttachments>
              {attachments.map((attachment) => (
                <ComposerAttachmentChip
                  key={attachment.name}
                  attachment={attachment}
                  onRemove={(name) =>
                    setAttachments((current) =>
                      current.filter((a) => a.name !== name),
                    )
                  }
                />
              ))}
            </ComposerAttachments>
          )}
          {voice ? (
            <ComposerVoice recording seconds={7} />
          ) : (
            <ComposerInput
              value={value}
              placeholder="Ask anything"
              onChange={(event) => setValue(event.target.value)}
              onSubmit={() => setValue("")}
            />
          )}
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton
                onClick={() => setAttachments(ATTACHMENTS)}
              />
              <div className="relative">
                <ComposerMenu open={modelOpen}>
                  {MODELS.map((entry) => (
                    <ComposerModelItem
                      key={entry.name}
                      entry={entry}
                      selected={entry.name === model}
                      onClick={() => {
                        setModel(entry.name);
                        setModelOpen(false);
                      }}
                    />
                  ))}
                </ComposerMenu>
                <ComposerModelTrigger
                  model={model}
                  open={modelOpen}
                  onClick={() => setModelOpen((open) => !open)}
                />
              </div>
            </ComposerActions>
            <ComposerActions>
              <ComposerContext
                usage={{ system: 12, tools: 8, messages: 54, total: 200 }}
              />
              <ComposerVoiceButton active={voice} onClick={() => {}} />
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={() => setValue("")}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}

export default defineSections([
  {
    id: "composer",
    title: "Composer",
    category: "chat",
    notes:
      "composer.tsx (standalone): attachment chips, input, attach, model trigger, context meter, voice and send.",
    render: () => <StandaloneComposer />,
  },
  {
    id: "composer-slash-menu",
    title: "Composer (slash menu open)",
    category: "chat",
    notes: "The value starts with /, so the command menu is open.",
    render: () => <StandaloneComposer initialValue="/" />,
  },
  {
    id: "composer-mention-menu",
    title: "Composer (mention menu open)",
    category: "chat",
    notes: "The value ends with @Ma, so the people menu is open.",
    render: () => <StandaloneComposer initialValue="Ask @Ma" />,
  },
  {
    id: "composer-model-menu",
    title: "Composer (model menu open)",
    category: "chat",
    render: () => <StandaloneComposer initialModelOpen />,
  },
  {
    id: "composer-voice",
    title: "Composer (recording)",
    category: "chat",
    notes: "The voice state with the waveform instead of the input.",
    render: () => <StandaloneComposer voice />,
  },
]);
