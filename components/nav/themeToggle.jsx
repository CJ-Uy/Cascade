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
    // Use a div with an onClick handler that spans the full width.
    // The parent DropdownMenuItem provides the hover effect and padding.
    <div
      onClick={toggleTheme}
      className="flex w-full cursor-pointer items-center gap-2"
    >
      {/* Use a React Fragment <> to avoid an unnecessary div */}
      {theme === "dark" ? (
        <>
          <Sun
            size={ICON_SIZE}
            className="text-muted-foreground"
            aria-label="Switch to light mode"
          />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon
            size={ICON_SIZE}
            className="text-muted-foreground"
            aria-label="Switch to dark mode"
          />
          <span>Dark Mode</span>
        </>
      )}
    </div>
  );
};

export { ThemeToggleButton };
