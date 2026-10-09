import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Variant, Variants } from "../src/index";

const features = ["Typed", "Inline", "Guarded"];

function App() {
  return (
    <main>
      <Variants id="hero" label="Hero" default="split">
        <Variant id="centered" label="Centered">
          <header style={{ textAlign: "center", padding: "48px 0" }}>
            <h1>Compare variants in place</h1>
            <p>Pick one, delete the rest.</p>
          </header>
        </Variant>
        <Variant id="split" label="Split">
          <header style={{ display: "flex", gap: 24, padding: "48px 0" }}>
            <h1 style={{ flex: 1 }}>Compare variants in place</h1>
            <p style={{ flex: 1 }}>Pick one, delete the rest.</p>
          </header>
        </Variant>
      </Variants>

      <Variants id="features" label="Feature list">
        <Variant id="grid" label="Three-column grid">
          <div className="grid">
            {features.map((feature) => (
              <div key={feature} className="card">
                {feature}
              </div>
            ))}
          </div>
        </Variant>
        <Variant id="list" label="Plain list">
          <ul>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </Variant>
      </Variants>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
