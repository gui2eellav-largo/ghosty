import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FloatingBar from "./components/FloatingBar";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [windowLabel, setWindowLabel] = useState<string>("");

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);
  }, []);

  if (windowLabel === "floating") {
    return <FloatingBar />;
  }

  return <Dashboard />;
}
