import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AkivaApproverSideBar } from "@/components/akivaApprover/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AkivaApproverSideBar />
      <main className="flex-grow">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
