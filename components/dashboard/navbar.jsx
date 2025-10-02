"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/app/contexts/SessionProvider";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronUp,
  FilePlus,
  History,
  Play,
  CheckSquare,
  Flag,
  Users,
  Building,
  FileText,
  Shield,
  Settings,
  Home,
  MessagesSquare,
} from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggleButton } from "@/components/dashboard/themeToggle";
import { getMiddleInitial } from "@/lib/utils";

const generalItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Messages",
    url: "/chat",
    icon: MessagesSquare,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

// 1. Define the menu items for each group
const requisitionItems = [
  { title: "Create", url: "/requisitions/create", icon: FilePlus },
  { title: "Running", url: "/requisitions/running", icon: Play },
  { title: "History", url: "/requisitions/history", icon: History },
];

const approvalItems = [
  { title: "To Approve", url: "/approvals", icon: CheckSquare },
  { title: "Flagged", url: "/flagged", icon: Flag },
];

const adminItems = [
  { title: "Employees", url: "/admin/employees", icon: Users },
  { title: "Approval System", url: "/admin/approval-system", icon: FileText },
  { title: "Templates", url: "/admin/templates", icon: Building },
];

const systemAdminItems = [
  { title: "System Settings", url: "/system-admin/settings", icon: Settings },
  { title: "- All BUs -", url: "/system-admin/all-bus", icon: Shield },
];

export function Navbar() {
  const path = usePathname();
  const { authContext, currentBuPermission, hasSystemRole, selectedBuId } =
    useSession();

  if (!authContext) {
    // User is logged out, show a minimal state or nothing
    return null;
  }

  const { profile } = authContext;

  // 2. Determine the user's permission level for the currently selected BU
  // A 'MEMBER' is a user in a BU but with no specific role assigned.
  const permissionLevel = currentBuPermission?.permission_level || "MEMBER";

  // 3. Construct the full name robustly
  const fullName = [
    profile.first_name,
    getMiddleInitial(profile.middle_name),
    profile.last_name,
  ]
    .filter(Boolean) // Removes any null, undefined, or empty parts
    .join(" "); // Joins the remaining parts with a space

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="flex items-center justify-center">
        <div className="mt-2 flex-shrink-0">
          <Link href="/" className="block">
            {" "}
            {/* Light Mode Logo */}
            <Image
              src="/svgs/Logo&TextBlack.svg"
              alt="Akiva Cascade Logo"
              width={150}
              height={40}
              className="block dark:hidden" // `block` by default, `hidden` in dark mode
            />
            {/* Dark Mode Logo */}
            <Image
              src="/svgs/Logo&TextWhite.svg"
              alt="Akiva Cascade Logo"
              width={150}
              height={40}
              className="hidden dark:block" // `hidden` by default, `block` in dark mode
            />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* General */}
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems.map((item) => (
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

        {/* Group 1: Requisitions (Visible to almost everyone) */}
        <SidebarGroup>
          <SidebarGroupLabel>Requisitions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {requisitionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={path.startsWith(item.url)}
                  >
                    <Link href={`${item.url}?bu_id=${selectedBuId}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 2: Approvals (Visible to Approvers, BU Admins, and System Admins) */}
        {(permissionLevel === "APPROVER" ||
          permissionLevel === "BU_ADMIN" ||
          hasSystemRole("SYSTEM_ADMIN")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Approvals</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {approvalItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={path.startsWith(item.url)}
                    >
                      <Link href={`${item.url}?bu_id=${selectedBuId}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Group 3: Management (Visible to BU Admins and System Admins) */}
        {(permissionLevel === "BU_ADMIN" || hasSystemRole("SYSTEM_ADMIN")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={path.startsWith(item.url)}
                    >
                      <Link href={`${item.url}?bu_id=${selectedBuId}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Group 4: System Administration (Visible ONLY to System Admins) */}
        {hasSystemRole("SYSTEM_ADMIN") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-red-500">
              System Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={path.startsWith(item.url)}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="bg-gray-200 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-800/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex w-full items-center">
                  <Avatar className="mr-3 h-8 w-8">
                    <AvatarImage
                      src={profile.image_url ?? undefined}
                      alt={fullName}
                    />
                    <AvatarFallback>
                      {profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{fullName}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  <ThemeToggleButton />
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
