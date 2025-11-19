"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeToggleButton = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder to prevent layout shift and match item height
    return <div className="h-6 w-full" />;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const ICON_SIZE = 16;

  return (
    <button
      onClick={toggleTheme}
      className="flex w-full cursor-pointer items-center gap-2"
    >
      {theme === "dark" ? (
        <>
          <Sun size={ICON_SIZE} aria-label="Switch to light mode" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon size={ICON_SIZE} aria-label="Switch to dark mode" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
};

export { ThemeToggleButton };
