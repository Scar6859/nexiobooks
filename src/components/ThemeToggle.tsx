"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--header-control-border)] text-[var(--header-text)] transition-[color,border-color,background-color] duration-[250ms] ease hover:bg-[var(--header-control-hover)]"
    >
      {isDark ? <Sun className="h-4 w-4 text-[var(--gold)]" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
