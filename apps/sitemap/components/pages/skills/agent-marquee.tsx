import { AgentIcon } from "@/components/library/agent-icons";

type Agent = { id: string; name: string };

/** The agents' icons in one line, scrolling; it pauses on hover and stands still for reduced motion. */
export function AgentMarquee({ agents }: { agents: readonly Agent[] }) {
  return (
    <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <ul className="flex w-max animate-[skills-agent-marquee_90s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...agents, ...agents].map((agent, index) => {
          const copy = index >= agents.length;
          return (
            <li
              key={index}
              aria-hidden={copy || undefined}
              title={agent.name}
              className="flex shrink-0 items-center px-3.5"
            >
              <AgentIcon id={agent.id} fallback={null} />
              <span className="sr-only">{agent.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
