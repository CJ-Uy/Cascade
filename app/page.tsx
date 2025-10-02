"use client";

import { HomeNav } from "@/components/homeNav";
import { useState, useEffect } from "react";

// --- ADVANCED ANIMATION STORYBOARDS ---
// These paths are longer, have more dramatic movement, and will feel more random.

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

export default function Home() {
  const [blob1Index, setBlob1Index] = useState(0);
  const [blob2Index, setBlob2Index] = useState(0);
  const [blob3Index, setBlob3Index] = useState(0);

  // --- INDEPENDENT, NON-REPEATING TIMERS ---
  // Using prime numbers for intervals (7s, 11s, 13s) makes the loops
  // feel completely random and non-repeating for a very long time.

  useEffect(() => {
    const interval = setInterval(
      () => setBlob1Index((prev) => (prev + 1) % blob1Path.length),
      5000, // Corrected from 300 to match transition duration
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
    <div className="bg-gray-50 dark:bg-gray-900 h-screen">
      <HomeNav />
      <main>
        <div className="relative isolate overflow-hidden px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="relative text-center">
              {/* This is the text content that will appear on top */}
              <div className="relative z-10">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
                  Effortlessly{" "}
                  <span className="relative inline-block">
                    <span className="text-emerald-500">Cascade</span>
                  </span>{" "}
                  Requests to Approvals
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                  Remotely guide requisitions, approvals, and files down the
                  line. No bottlenecks, just a seamless, transparent flow from
                  start to finish.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <a
                    href="/signup"
                    className="rounded-md bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    Get started
                  </a>
                  <a
                    href="/features"
                    className="text-sm leading-6 font-semibold text-gray-900 dark:text-white"
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>

              {/* --- THE ANIMATION CANVAS --- */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="relative h-full w-full">
                  {/* --- BLOB 1 --- */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className={`relative h-96 w-96 rounded-full bg-emerald-300/40 mix-blend-multiply blur-3xl filter transition-transform duration-[5000ms] ease-in-out dark:bg-emerald-800/40 ${blob1Path[blob1Index]}`}
                    ></div>
                  </div>

                  {/* --- BLOB 2 --- */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className={`relative h-80 w-80 rounded-full bg-teal-200/40 mix-blend-multiply blur-3xl filter transition-transform duration-[8000ms] ease-in-out dark:bg-teal-700/40 ${blob2Path[blob2Index]}`}
                    ></div>
                  </div>

                  {/* --- BLOB 3 --- */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className={`relative h-72 w-72 rounded-full bg-green-200/40 mix-blend-multiply blur-3xl filter transition-transform duration-[9000ms] ease-in-out dark:bg-green-700/40 ${blob3Path[blob3Index]}`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
