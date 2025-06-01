"use client";

import {
	Home,
	MessagesSquare,
	FileCheck2,
	FileClock,
	UserRoundCog,
	Signature,
	LayoutTemplate,
} from "lucide-react";
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

// Menu items.
const items = [
	{
		title: "Dashboard",
		url: "/bu-head",
		icon: Home,
	},
	{
		title: "Running",
		url: "/bu-head/running",
		icon: FileClock,
	},
	{
		title: "Completed",
		url: "/bu-head/completed",
		icon: FileCheck2,
	},
	{
		title: "Employees",
		url: "/bu-head/employees",
		icon: UserRoundCog,
	},
	{
		title: "Approval System",
		url: "/bu-head/approval-system",
		icon: Signature,
	},
	{
		title: "Templates",
		url: "/bu-head/req-templates",
		icon: LayoutTemplate,
	},
	{
		title: "Messages",
		url: "/bu-head/messages",
		icon: MessagesSquare,
	},
];

export function BuHeadSideBar() {
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
								<DropdownMenuItem>
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
