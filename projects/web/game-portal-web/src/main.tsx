import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { repairCorruptedJsonStorage } from "./storage";
import "./styles.css";

repairCorruptedJsonStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
