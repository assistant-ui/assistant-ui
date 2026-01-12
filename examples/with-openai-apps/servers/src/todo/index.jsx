import { createRoot } from "react-dom/client";
import App from "./todo";

createRoot(document.getElementById("todo-root")).render(<App />);

export { App };
export default App;
