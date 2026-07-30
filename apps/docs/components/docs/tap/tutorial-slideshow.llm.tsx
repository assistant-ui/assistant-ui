import { tapTutorialSteps } from "./tutorial-data";

export function TapTutorialSlideshowLLM() {
  return (
    <>
      {tapTutorialSteps.map((step, index) => (
        <section key={step.title}>
          <h3>
            {index + 1}. {step.title}
          </h3>
          <pre>
            <code className={`language-${step.language}`}>{step.code}</code>
          </pre>
        </section>
      ))}
    </>
  );
}
