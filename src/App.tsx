import { useState, useEffect } from "react";
import { getWindowLabel } from "@/lib/tauri-window";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FloatingBar from "./components/FloatingBar";
import Dashboard from "./components/Dashboard";
import { Onboarding } from "./components/Onboarding";
import { api } from "@/api/tauri";

export default function App() {
  const windowLabel = getWindowLabel();

  const [onboardingState, setOnboardingState] = useState<"loading" | "show" | "done">("loading");

  useEffect(() => {
    if (windowLabel !== "main") {
      setOnboardingState("done");
      return;
    }
    Promise.all([api.onboarding.isDone(), api.apiKeys.hasKey()])
      .then(([done, hasKey]) => {
        setOnboardingState(done || hasKey ? "done" : "show");
      })
      .catch(() => setOnboardingState("done"));
  }, [windowLabel]);

  const handleOnboardingComplete = async () => {
    try { await api.onboarding.markDone(); } catch { /* non-blocking */ }
    setOnboardingState("done");
  };

  if (windowLabel === "floating") {
    return <ErrorBoundary><FloatingBar /></ErrorBoundary>;
  }

  if (onboardingState === "loading") {
    return <div className="fixed inset-0 bg-[#0c0c0c]" />;
  }

  if (onboardingState === "show") {
    return <ErrorBoundary><Onboarding onComplete={handleOnboardingComplete} /></ErrorBoundary>;
  }

  return <ErrorBoundary><Dashboard /></ErrorBoundary>;
}
