import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadCustomCommunities } from "./lib/communities";

const timeout = new Promise((r) => setTimeout(r, 2500));
Promise.race([loadCustomCommunities(), timeout]).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
