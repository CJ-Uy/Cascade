// components/HeroSection.tsx
"use client";

import { useState, useEffect } from "react";

// --- ADVANCED ANIMATION STORYBOARDS ---
const blob1Path = [
  "translate-x-0 translate-y-0 scale-100 rotate-0",
  "translate-x-48 -translate-y-24 scale-125 rotate-45",
  "-translate-x-32 translate-y-40 scale-75 rotate-[-25deg]",
  "translate-x-24 translate-y-24 scale-110 rotate-10",
  "-translate-x-40 -translate-y-32 scale-100 rotate-[-5deg]",
];

const blob2Path = [
  "translate-x-0 translate-y-0 scale-100 rotate-0",
  "-translate-x-40 translate-y-32 scale-110 rotate-[-35deg]",
  "translate-x-32 -translate-y-24 scale-125 rotate-20",
  "-translate-x-24 -translate-y-20 scale-90 rotate-5",
  "translate-x-48 translate-y-20 scale-100 rotate-[-15deg]",
];

const blob3Path = [
  "translate-x-0 translate-y-0 scale-100 rotate-0",
  "translate-x-24 translate-y-32 scale-90 rotate-25",
  "-translate-x-48 -translate-y-24 scale-125 rotate-[-40deg]",
  "translate-x-32 translate-y-20 scale-110 rotate-15",
  "-translate-x-20 -translate-y-40 scale-100 rotate-[-10deg]",
  "translate-x-10 translate-y-10 scale-90 rotate-0",
];

export function HeroSection() {
  const [blob1Index, setBlob1Index] = useState(0);
  const [blob2Index, setBlob2Index] = useState(0);
  const [blob3Index, setBlob3Index] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setBlob1Index((prev) => (prev + 1) % blob1Path.length),
      5000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setBlob2Index((prev) => (prev + 1) % blob2Path.length),
      8000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setBlob3Index((prev) => (prev + 1) % blob3Path.length),
      9000,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    // Use min-h-screen to ensure it takes at least the full screen height
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        {/* This is the text content that will appear on top */}
        <div className="relative z-10">
          <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-6xl">
            Effortlessly{" "}
            <span className="relative inline-block">
              <span className="text-primary">Cascade</span>
            </span>{" "}
            Requests to Approvals
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Remotely guide requisitions, approvals, and files down the line. No
            bottlenecks, just a seamless, transparent flow from start to finish.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Get started
            </a>
            <a
              href="/dashboard"
              className="text-foreground text-sm leading-6 font-semibold"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* --- THE ANIMATION CANVAS --- */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10" // Use -z-10 to place behind content
        >
          <div className="relative h-full w-full">
            {/* --- BLOB 1 --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={`bg-primary/20 dark:bg-primary/30 h-96 w-96 rounded-full mix-blend-multiply blur-3xl filter transition-transform duration-[5000ms] ease-in-out ${blob1Path[blob1Index]}`}
              ></div>
            </div>

            {/* --- BLOB 2 --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={`bg-secondary/15 dark:bg-secondary/25 h-80 w-80 rounded-full mix-blend-multiply blur-3xl filter transition-transform duration-[8000ms] ease-in-out ${blob2Path[blob2Index]}`}
              ></div>
            </div>

            {/* --- BLOB 3 --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={`bg-accent/25 dark:bg-accent/20 h-72 w-72 rounded-full mix-blend-multiply blur-3xl filter transition-transform duration-[9000ms] ease-in-out ${blob3Path[blob3Index]}`}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
