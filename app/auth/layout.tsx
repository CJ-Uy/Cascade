"use client";

import { HomeNav } from "@/components/landing/homeNav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <HomeNav />
      <main className="flex-grow">{children}</main>
    </div>
  );
}
