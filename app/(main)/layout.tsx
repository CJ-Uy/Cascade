"use client";

import { Navbar } from "@/components/nav/bar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/app/contexts/SessionProvider";
import { NavigationProgress } from "@/components/navigation-progress";
import { NotificationBell } from "@/components/notifications/notification-bell";

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
      <main className="flex min-h-screen w-full flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <div className="flex-1 p-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
