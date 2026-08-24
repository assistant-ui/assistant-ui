import { tapTutorialSteps } from "./tutorial-data";

const stripAnnotationComments = (code: string) =>
  code
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("// !"))
    .join("\n");

export function TapTutorialSlideshowLLM() {
  return (
    <>
      {tapTutorialSteps.map((step, index) => (
        <section key={step.title}>
          <h3>
            {index + 1}. {step.title}
          </h3>
          <pre>
            <code className={`language-${step.language}`}>
              {stripAnnotationComments(step.code)}
            </code>
          </pre>
        </section>
      ))}
    </>
  );
}
