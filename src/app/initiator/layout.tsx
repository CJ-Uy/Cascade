import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { InitiatorSidebar } from "@/components/initiator/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <InitiatorSidebar />
      <main className="flex-grow">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
