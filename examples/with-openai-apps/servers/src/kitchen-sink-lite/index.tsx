import { createRoot } from "react-dom/client";
import KitchenSinkLite from "./kitchen-sink-lite";
import "./kitchen-sink-lite.css";

const root = document.getElementById("kitchen-sink-lite-root");

if (root) {
  createRoot(root).render(<KitchenSinkLite />);
}

export default KitchenSinkLite;
