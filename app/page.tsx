"use client";

import { HomeNav } from "@/components/landing/homeNav";
import { HeroSection } from "@/components/landing/hero-section";
import { AboutSection } from "@/components/landing/about-section";

export default function Home() {
  return (
    <div className="bg-background h-screen">
      <HomeNav />
      <main>
        <HeroSection />
        <AboutSection />
      </main>
    </div>
  );
}
