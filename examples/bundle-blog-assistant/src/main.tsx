import { useEffect, useRef, useState } from "react";
import { PreviewChat } from "../../bundle-shared/chat";
import "./styles.css";

const article = {
  title: "A smaller garden, a longer season.",
  description: "A practical guide to growing herbs on a city balcony.",
  sections: [
    {
      title: "Choose a sunny corner",
      body: "Most culinary herbs need at least six hours of direct sunlight each day. A south-facing balcony is a good starting point. Mint and parsley tolerate partial shade; rosemary and thyme prefer the sunniest spot.",
    },
    {
      title: "Give roots somewhere to go",
      body: "Choose containers at least 20 cm deep, with drainage holes. Fill them with peat-free potting mix. Keep mint in its own pot because its roots spread quickly. A shallow tray beneath each container protects your balcony.",
    },
    {
      title: "Water the soil, not the calendar",
      body: "Check the top 2 cm of soil with a finger. Water when it feels dry, until a little drains from the base. During hot weather, check every morning. Rosemary and thyme prefer the soil to dry slightly between waterings.",
    },
    {
      title: "Harvest little and often",
      body: "Snip a few stems regularly to encourage new growth. Take no more than one third of a plant at once. Pinch off basil flowers to keep leaves growing. Start with basil, parsley, and thyme; add more varieties after the first season.",
    },
  ],
};

function answer(text: string) {
  const query = text.toLowerCase();
  const selected = /water|dry|soil/.test(query)
    ? article.sections[2]
    : /pot|container|mint|root|deep/.test(query)
      ? article.sections[1]
      : /sun|shade|light/.test(query)
        ? article.sections[0]
        : /harvest|basil|start|herb|grow/.test(query)
          ? article.sections[3]
          : undefined;
  if (selected)
    return `${selected.body}\n\nFrom this article: “${selected.title}”. This local demo answers supported questions from the text on this page.`;
  if (/summar|main|takeaway/.test(query))
    return "The article recommends a sunny spot, deep pots with drainage, watering when the top 2 cm of soil is dry, and regular small harvests. Begin with basil, parsley, and thyme. These points all come from the article beside this chat.";
  return "I can answer the article's questions about sunlight, containers, watering, and harvesting. Try “How often should I water?” or “Which herbs should I start with?” This local preview uses scripted, page-grounded answers.";
}

export default function App() {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  return (
    <main className="blog-example">
      <header className="blog-masthead">
        <span>Field notes</span>
        <span>Sample article</span>
      </header>
      <article className="sample-article">
        <p className="article-category">A balcony garden / 4 min read</p>
        <h1>{article.title}</h1>
        <p className="article-deck">{article.description}</p>
        <div
          className="herb-figure"
          aria-label="Herb names: basil, parsley, thyme"
        >
          <span>Basil</span>
          <span>Parsley</span>
          <span>Thyme</span>
        </div>
        {article.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </article>
      {!open && (
        <div className="launcher-invitation">
          <span>Questions about the article?</span>
          <svg aria-hidden="true" viewBox="0 0 110 65">
            <path d="M4 9 C45 -2 96 13 85 52 M73 43 L85 55 L97 42" />
          </svg>
        </div>
      )}
      <button
        className="assistant-launcher"
        ref={launcher}
        type="button"
        aria-expanded={open}
        aria-controls="article-assistant"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? "Close assistant" : "Ask about this article"}
        <span aria-hidden>{open ? "×" : "↗"}</span>
      </button>
      {open && (
        <section
          id="article-assistant"
          role="dialog"
          aria-modal="false"
          aria-label="Article assistant"
          className="article-assistant"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <button
            ref={closeButton}
            className="assistant-close"
            type="button"
            onClick={close}
            aria-label="Close article assistant"
          >
            ×
          </button>
          <PreviewChat
            title="Article assistant"
            intro="Ask about this page."
            suggestions={[
              "Which herbs should I start with?",
              "How often should I water?",
              "Summarize the article",
            ]}
            onPrompt={answer}
          />
        </section>
      )}
    </main>
  );
}
