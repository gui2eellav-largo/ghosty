import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import { getWindowLabel } from "@/lib/tauri-window";

const label = getWindowLabel();
if (label === "floating") {
  document.documentElement.classList.add("floating-window");
  document.body.classList.add("floating-window");
}

// Apply stored theme preference, fallback to system preference
const storedTheme = (() => {
  try { return localStorage.getItem("ghosty-theme"); } catch { return null; }
})();
const shouldBeDark =
  storedTheme === "dark" ||
  (storedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
if (shouldBeDark) {
  document.documentElement.classList.add("dark");
}

const root = document.getElementById("app");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
