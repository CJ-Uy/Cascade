"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [isPending] = useTransition();

  useEffect(() => {
    // Clear loading when pathname changes
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    // Listen for link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href && !link.target && !link.hasAttribute("download")) {
        try {
          const url = new URL(link.href);
          const currentUrl = new URL(window.location.href);

          // Only show loading if navigating to a different page on the same origin
          if (
            url.origin === currentUrl.origin &&
            url.pathname !== currentUrl.pathname
          ) {
            setLoading(true);
          }
        } catch (error) {
          // Invalid URL, ignore
        }
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  if (!loading && !isPending) return null;

  return (
    <div className="fixed top-0 left-0 z-[100] h-1 w-full">
      <div className="bg-primary animate-progress h-full w-full origin-left shadow-lg" />
    </div>
  );
}
