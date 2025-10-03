"use client";

import { HomeNav } from "@/components/landing/homeNav";
import { HeroSection } from "@/components/landing/hero-section";
import { AboutSection } from "@/components/landing/about-section";

export default function Home() {
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <HomeNav />
      <main>
        <HeroSection />
        <AboutSection />
      </main>
    </div>
  );
}
