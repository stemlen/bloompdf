"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const currentTheme = resolvedTheme || theme || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const css = document.createElement("style");
      css.appendChild(
        document.createTextNode(
          `*, *::before, *::after { -webkit-transition: none !important; -moz-transition: none !important; -o-transition: none !important; -ms-transition: none !important; transition: none !important; }`
        )
      );
      document.head.appendChild(css);

      if (nextTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      setTheme(nextTheme);

      // Force style recalculation then remove style tag after reflow
      window.getComputedStyle(root).opacity;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (css.parentNode) {
            css.parentNode.removeChild(css);
          }
        });
      });
    } else {
      setTheme(nextTheme);
    }
  };

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <button
      onClick={handleToggle}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative cursor-pointer"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className={`h-[18px] w-[18px] transition-transform duration-150 ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      <Moon className={`absolute h-[18px] w-[18px] transition-transform duration-150 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
    </button>
  );
}
