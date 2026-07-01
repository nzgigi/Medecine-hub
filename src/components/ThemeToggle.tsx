"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  variant?: "desktop" | "icon";
};

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  return stored === "dark" || (!stored && prefersDark);
}

export default function ThemeToggle({ variant = "desktop" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className="rounded-lg border border-stone-200 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-black dark:text-stone-100 dark:hover:bg-stone-900"
        aria-label="Changer de thème"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="ml-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-black dark:text-stone-100 dark:hover:bg-stone-900"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="text-sm">Clair</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="text-sm">Sombre</span>
        </>
      )}
    </button>
  );
}
