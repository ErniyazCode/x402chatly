"use client";

import { useEffect, useState } from "react";
import { Moon, SunDim } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "x402chatly-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveTheme = (): Theme => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    };

  const nextTheme = resolveTheme();
  // React rule warns on this hydration sync; we run it once to align browser state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setTheme(nextTheme);
    applyTheme(nextTheme);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === "dark" || event.newValue === "light")) {
        const updatedTheme = event.newValue as Theme;
        setTheme(updatedTheme);
        applyTheme(updatedTheme);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    }
    applyTheme(nextTheme);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "group relative flex items-center gap-2 overflow-hidden rounded-full border px-2 py-1 pr-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        "shadow-[0_12px_28px_-20px_rgba(88,86,214,0.8)]",
        isDark
          ? "border-white/10 bg-gradient-to-r from-violet-600/90 via-blue-600/80 to-slate-900/80 text-white hover:from-violet-500 hover:to-slate-800"
          : "border-slate-200/60 bg-gradient-to-r from-amber-100/90 via-rose-100/80 to-sky-100/80 text-slate-900 hover:border-slate-200"
      )}
    >
      <span className="relative flex h-6 w-14 items-center rounded-full border border-white/10 bg-black/10 px-1 py-0.5 text-white/70 backdrop-blur transition-colors group-hover:border-white/20 dark:text-white/80 dark:bg-white/10">
        <span
          className={cn(
            "absolute inset-y-0.5 left-0.5 w-5 rounded-full bg-white/30 shadow-sm transition-transform duration-300 ease-out",
            isDark ? "translate-x-7" : "translate-x-0"
          )}
        />
        <span className="relative z-10 flex w-1/2 items-center justify-center text-[10px] font-medium uppercase tracking-[0.16em]">
          <Moon className={cn("h-3 w-3 transition-all", isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-75 opacity-40")} />
        </span>
        <span className="relative z-10 flex w-1/2 items-center justify-center text-[10px] font-medium uppercase tracking-[0.16em] text-amber-500">
          <SunDim className={cn("h-3 w-3 transition-all", isDark ? "rotate-45 scale-75 opacity-40" : "rotate-0 scale-100 opacity-100")}
          />
        </span>
      </span>
      <span className="tracking-[0.16em] uppercase text-[10px]">
        {isDark ? "Night mode" : "Day mode"}
      </span>
    </button>
  );
}

