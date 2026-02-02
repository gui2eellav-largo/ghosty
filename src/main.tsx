import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";

const label = getCurrentWindow().label;
if (label === "floating") {
  document.documentElement.classList.add("floating-window");
  document.body.classList.add("floating-window");
}

// Ensure dark mode class is applied based on system preference
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
