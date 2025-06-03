import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { InitiatorSideBar } from "@/components/initiator/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<InitiatorSideBar />
			<main className="flex-grow">
				<SidebarTrigger />
				{children}
			</main>
		</SidebarProvider>
	);
}
