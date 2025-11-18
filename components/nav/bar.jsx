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
  Building2, // Added for Business Units
  ClipboardEdit, // Added for Form Templates
  Milestone, // Added for Approval Workflows
} from "lucide-react";

import { getMiddleInitial } from "@/lib/utils";

import { LogoutButton } from "@/components/nav/logout-button";
import { ThemeToggleButton } from "@/components/nav/theme-toggle";
import { ReturnToLanding } from "@/components/nav/return-to-landing";

const generalItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Chat",
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
  { title: "To Approve", url: "/approvals/to-approve", icon: CheckSquare },
  { title: "Flagged", url: "/approvals/flagged", icon: Flag },
];

const adminItems = [
  { title: "Employees", url: "/management/employees", icon: Users },
  {
    title: "Approval System",
    url: "/management/approval-system",
    icon: FileText,
  },
  { title: "Forms", url: "/management/forms", icon: Building },
];

const systemAdminItems = [
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Manage Organizations",
    url: "/admin/organizations",
    icon: Building,
  },
  {
    title: "Business Units",
    url: "/management/business-units",
    icon: Building2,
  },
  {
    title: "Form Templates",
    url: "/management/form-templates",
    icon: ClipboardEdit,
  },
  {
    title: "Approval Workflows",
    url: "/management/approval-workflows",
    icon: Milestone,
  },
];

const orgAdminItems = [
  {
    title: "Org Dashboard",
    url: "/organization-admin",
    icon: Building,
  },
];

export function Navbar() {
  const path = usePathname();
  const {
    authContext,
    currentBuPermission,
    hasSystemRole,
    hasOrgAdminRole,
    selectedBuId,
  } = useSession();

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
              priority
            />
            {/* Dark Mode Logo */}
            <Image
              src="/svgs/Logo&TextWhite.svg"
              alt="Akiva Cascade Logo"
              width={150}
              height={40}
              className="hidden dark:block" // `hidden` by default, `block` in dark mode
              priority
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

        {/* Group 1: Requisitions (Visible to almost everyone EXCEPT Super Admins) */}
        {!hasSystemRole("Super Admin") && (
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
                      <Link href={`${item.url}/${selectedBuId}`}>
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
                      <Link href={`${item.url}/${selectedBuId}`}>
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
                      <Link href={`${item.url}/${selectedBuId}`}>
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
        {hasSystemRole("Super Admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-destructive">
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

        {/* Group 5: Organization Administration (Visible ONLY to Organization Admins) */}
        {hasOrgAdminRole() && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary">
              Organization Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {orgAdminItems.map((item) => (
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

      <SidebarFooter className="bg-muted hover:bg-muted/80">
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
                  <ReturnToLanding />
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
