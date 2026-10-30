import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Command = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[13px] [font-variant-ligatures:none]">
    {children}
  </span>
);

const DETAILS: { term: string; detail: ReactNode }[] = [
  {
    term: "On your machine",
    detail: (
      <>
        <Command>npx</Command> downloads <Command>setup-agent</Command> from npm
        and runs it. It prints setup instructions for your agent and holds a
        connection to the setup server in the link. It touches your files only
        to read a plan file or write an env file your agent names, and to keep a
        one-time key in a private user folder. Run by hand in a terminal, it
        offers to start a coding agent.
      </>
    ),
  },
  {
    term: "What this page sees",
    detail:
      "Your project's folder path, your agent's name, and the questions, plan, steps and messages your agent sends. Your code reaches this page only if your agent puts it in one of those.",
  },
  {
    term: "What this page sends",
    detail:
      "Begin plan, your answers, plan approval or changes, and messages. Your agent reads them and acts on them. An API key you enter waits on the setup server for up to an hour, until the CLI fetches it once and writes it to your env file.",
  },
  {
    term: "Who can use the link",
    detail:
      "Anyone with the link can read this setup and act as you or your agent, so keep it private. There is no sign-in behind it, and the server stores the latest setup under it.",
  },
  {
    term: "How to stop",
    detail: (
      <>
        Cancel ends this setup and tells your agent, which stays connected for
        your next one. To disconnect, stop the agent's{" "}
        <Command>setup-agent stream</Command> command or quit the agent.
      </>
    ),
  },
];

/** What the command in the prompt runs, what crosses to the browser and how to stop it, next to the command itself. */
export function SetupAgentExplainer() {
  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-muted-foreground text-sm leading-relaxed">
        <Command>setup-agent</Command> is a CLI from npm that relays messages
        between your agent and this page. Your agent does the reading and
        editing, with the permissions you gave it.
      </p>
      <Dialog>
        <DialogTrigger
          render={<Button variant="link" className="h-auto p-0 underline" />}
        >
          What it shares and how to stop
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto motion-reduce:animate-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              What <Command>setup-agent</Command> does
            </DialogTitle>
          </DialogHeader>
          <dl className="flex flex-col gap-3">
            {DETAILS.map(({ term, detail }) => (
              <div key={term}>
                <dt className="font-medium">{term}</dt>
                <dd className="text-muted-foreground mt-0.5 leading-relaxed">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
