"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  variant?: "desktop" | "icon";
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedTheme: boolean | null = null;

function computeTheme(): boolean {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  return stored === "dark" || (!stored && prefersDark);
}

// Snapshot lu côté client (via useSyncExternalStore, qui gère nativement la
// divergence serveur/client sans provoquer de warning d'hydratation React).
function getSnapshot(): boolean {
  if (cachedTheme === null) {
    cachedTheme = computeTheme();
  }

  return cachedTheme;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(isDark: boolean) {
  cachedTheme = isDark;
  localStorage.setItem("theme", isDark ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle({ variant = "desktop" }: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = () => {
    setTheme(!isDark);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className="rounded-lg border border-stone-200 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100 dark:hover:bg-[#1d1c18]"
        aria-label="Changer de thème"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="ml-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100 dark:hover:bg-[#1d1c18]"
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
