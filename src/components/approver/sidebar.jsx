"use client";

import { Home, MessagesSquare, FileCheck2, FileClock } from "lucide-react";
import { usePathname } from "next/navigation";
import {
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronUp } from "lucide-react";

// Sign out imports.
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Menu items.
const items = [
	{
		title: "Dashboard",
		url: "/approver",
		icon: Home,
	},
	{
		title: "Running",
		url: "/approver/running",
		icon: FileClock,
	},
	{
		title: "Completed",
		url: "/approver/completed",
		icon: FileCheck2,
	},
	{
		title: "Messages",
		url: "/approver/messages",
		icon: MessagesSquare,
	},
];

export function ApproverSideBar() {
	// Sign out function.
	const [isPending, setIsPending] = useState(false);
	const router = useRouter();
	async function handleClick() {
		await signOut({
		  fetchOptions: {
			onRequest: () => {
			  setIsPending(true);
			},
			onResponse: () => {
			  setIsPending(false); 
			},
			onError: (ctx) => {
			  toast.error(ctx.error.message);
			},
			onSuccess: () => {
			  toast.success("You've logged out.");
			  router.push("/auth/login");
			},
		  },
		});
	}

	const path = usePathname();
	return (
		<Sidebar>
			{/* Header */}
			<SidebarHeader className="flex items-center justify-center">
				<h1>Akiva Cascade</h1>
			</SidebarHeader>

			{/* Content */}
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Application</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild isActive={path === item.url}>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			{/* Footer */}
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton>
									Username
									<ChevronUp className="ml-auto" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
								<DropdownMenuItem>
									<span>Dark Mode</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<span>Report</span>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={handleClick}>
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
