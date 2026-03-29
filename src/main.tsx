import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import { getWindowLabel } from "@/lib/tauri-window";

console.log("[ghosty:main] main.tsx loaded");

const label = getWindowLabel();
console.log("[ghosty:main] window label:", label);
if (label === "floating") {
  document.documentElement.classList.add("floating-window");
  document.body.classList.add("floating-window");
}

// Ensure dark mode class is applied based on system preference
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}

const root = document.getElementById("app");
console.log("[ghosty:main] #app element:", root);

if (root) {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("[ghosty:main] React render called");
  } catch (err) {
    console.error("[ghosty:main] React render error:", err);
  }
} else {
  console.error("[ghosty:main] #app element NOT found");
}
