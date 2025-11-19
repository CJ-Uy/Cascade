"use client";

import { Navbar } from "@/components/nav/bar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/app/contexts/SessionProvider";
import { NavigationProgress } from "@/components/navigation-progress";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  if (!session.authContext) {
    return (
      <header>Something may have went wrong. Please refresh the page.</header>
    ); // Or null, as user might be logged out
  }

  return (
    <SidebarProvider>
      <NavigationProgress />
      <Navbar />
      <main className="flex-grow">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
