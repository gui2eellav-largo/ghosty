import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
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

  const toggle = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = effective === "dark" ? "light" : "dark";
    const doToggle = () => { applyTheme(next); sync(); };

    if ("startViewTransition" in document) {
      const { top, left, width, height } = e.currentTarget.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vt = (document as any).startViewTransition(() => { flushSync(doToggle); });
      await vt.ready;
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
        { duration: 400, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    } else {
      doToggle();
    }
  }, [effective, sync]);

  const isDark = effective === "dark";

  return (
    <button
      type="button"
      onClick={(e) => toggle(e)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-black/5 dark:hover:bg-white/5",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        isDark ? "focus-visible:ring-white/30" : "focus-visible:ring-black/20",
      )}
    >
      {isDark ? (
        <Moon size={16} strokeWidth={1.8} />
      ) : (
        <Sun size={16} strokeWidth={1.8} />
      )}
    </button>
  );
}
