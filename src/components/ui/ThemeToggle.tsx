import { useState, useEffect, useCallback } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function getEffectiveTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("ghosty-theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* ignore */ }
  return "system";
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  try {
    localStorage.setItem("ghosty-theme", theme);
  } catch { /* ignore */ }
}

export function ThemeToggle() {
  const [effective, setEffective] = useState<"light" | "dark">(getEffectiveTheme);

  const sync = useCallback(() => setEffective(getEffectiveTheme()), []);

  // Listen for system preference changes (when theme is "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
        sync();
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [sync]);

  // Apply stored theme on mount
  useEffect(() => {
    applyTheme(getStoredTheme());
    sync();
  }, [sync]);

  const toggle = () => {
    const next: Theme = effective === "dark" ? "light" : "dark";
    applyTheme(next);
    sync();
  };

  const isDark = effective === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex items-center w-[52px] h-[26px] rounded-full p-[3px]",
        "transition-all duration-500 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        isDark
          ? "focus-visible:ring-white/30"
          : "focus-visible:ring-black/20",
      )}
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          : "linear-gradient(135deg, #f8b500 0%, #fceabb 50%, #f8b500 100%)",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(0,0,0,0.4), 0 0 8px rgba(15,52,96,0.3)"
          : "inset 0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(248,181,0,0.2)",
      }}
    >
      {/* Track icons — faint behind the thumb */}
      <Sun
        size={10}
        className={cn(
          "absolute left-[7px] top-1/2 -translate-y-1/2 transition-opacity duration-300",
          isDark ? "opacity-20 text-white/40" : "opacity-0",
        )}
      />
      <Moon
        size={10}
        className={cn(
          "absolute right-[7px] top-1/2 -translate-y-1/2 transition-opacity duration-300",
          isDark ? "opacity-0" : "opacity-20 text-black/30",
        )}
      />

      {/* Thumb */}
      <div
        className={cn(
          "flex items-center justify-center w-[20px] h-[20px] rounded-full",
          "transition-all duration-500 ease-out",
          isDark ? "translate-x-[26px]" : "translate-x-0",
        )}
        style={{
          background: isDark
            ? "linear-gradient(135deg, #e2e8f0, #cbd5e1)"
            : "linear-gradient(135deg, #ffffff, #fef9ef)",
          boxShadow: isDark
            ? "0 1px 4px rgba(0,0,0,0.4)"
            : "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        {isDark ? (
          <Moon size={11} className="text-slate-700" strokeWidth={2.5} />
        ) : (
          <Sun size={11} className="text-amber-500" strokeWidth={2.5} />
        )}
      </div>
    </button>
  );
}
