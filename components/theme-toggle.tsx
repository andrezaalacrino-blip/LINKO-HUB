"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)]" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-[var(--hub-border)]
        bg-[var(--hub-card)]
        text-[var(--hub-muted)]
        shadow-sm
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-[#635bff]
        hover:text-[#635bff]
      "
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}