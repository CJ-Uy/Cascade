import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ApproverSideBar } from "@/components/approver/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<ApproverSideBar />
			<main className="flex-grow">
				<SidebarTrigger />
				{children}
			</main>
		</SidebarProvider>
	);
}
