import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { BuHeadSideBar } from "@/components/buHead/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <BuHeadSideBar />
      <main className="flex-grow">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
