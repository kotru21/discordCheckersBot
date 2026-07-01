import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ActivityShell } from "./discord/ActivityShell";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <ActivityShell>
      <App />
    </ActivityShell>
  </StrictMode>
);
