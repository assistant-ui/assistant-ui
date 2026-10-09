import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Variant, Variants } from "../src/index";

const features = ["Typed", "Inline", "Guarded"];

const demoState = new URLSearchParams(window.location.search).get("demo");
if (demoState) {
  window.sessionStorage.clear();
  for (const entry of demoState.split(",")) {
    const [key, value] = entry.split("=");
    if (key && value) window.sessionStorage.setItem(`contenders:${key}`, value);
  }
}

function FeatureCards({ filled }: { filled: boolean }) {
  return (
    <div className="grid">
      {features.map((feature) => (
        <div key={feature} className={filled ? "card filled" : "card"}>
          {feature}
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <main>
      <Variants id="hero" label="Hero" default="split">
        <Variant id="centered" label="Centered">
          <header style={{ textAlign: "center", padding: "40px 0" }}>
            <h1>Compare variants in place</h1>
            <p>Pick one, delete the rest.</p>
          </header>
        </Variant>
        <Variant id="split" label="Split">
          <header style={{ display: "flex", gap: 24, padding: "40px 0" }}>
            <h1 style={{ flex: 1, margin: 0 }}>Compare variants in place</h1>
            <p style={{ flex: 1, margin: 0 }}>Pick one, delete the rest.</p>
          </header>
        </Variant>
      </Variants>

      <Variants id="features" label="Feature list">
        <Variant id="grid" label="Three-column grid">
          <Variants id="card-style" label="Card style">
            <Variant id="outlined" label="Outlined">
              <FeatureCards filled={false} />
            </Variant>
            <Variant id="filled" label="Filled">
              <FeatureCards filled />
            </Variant>
          </Variants>
        </Variant>
        <Variant id="list" label="Plain list">
          <ul>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Variant>
      </Variants>

      <div className="row">
        <Variants id="cta" label="Call to action">
          <Variant id="button" label="Button">
            <button type="button">Get started</button>
          </Variant>
          <Variant id="link" label="Link">
            <a href="#start">Get started →</a>
          </Variant>
        </Variants>
        <Variants id="note" label="Footnote">
          <Variant id="short" label="Short">
            <p className="note">MIT licensed.</p>
          </Variant>
          <Variant id="long" label="Long">
            <p className="note">MIT licensed. Works with React 18 and 19.</p>
          </Variant>
        </Variants>
      </div>
    </main>
  );
}

if (new URLSearchParams(window.location.search).has("demo-focus")) {
  setTimeout(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyV", key: "v", altKey: true }),
    );
  }, 300);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
