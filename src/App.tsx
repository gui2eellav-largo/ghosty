import { getCurrentWindow } from "@tauri-apps/api/window";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FloatingBar from "./components/FloatingBar";
import Dashboard from "./components/Dashboard";

export default function App() {
  const windowLabel = getCurrentWindow().label;

  return (
    <ErrorBoundary>
      {windowLabel === "floating" ? <FloatingBar /> : <Dashboard />}
    </ErrorBoundary>
  );
}
