"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/app/contexts/SessionProvider";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronUp,
  ChevronDown,
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
  Building2,
  ClipboardEdit,
  Milestone,
  Sun,
  Moon,
  LogOut,
  Bell,
  Workflow,
} from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { createClient } from "@/lib/supabase/client";
import { AnimatedSection } from "@/components/nav/animated-section";
import { BuSelector } from "@/components/nav/bu-selector";
import { OrgSelector } from "@/components/nav/org-selector";
import { AdminBuSelector } from "@/components/nav/admin-bu-selector";

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
const requestItems = [
  { title: "Create", url: "/requests/create", icon: FilePlus },
  { title: "Pending", url: "/requests/pending", icon: Play },
  { title: "History", url: "/requests/history", icon: History },
];

const approvalItems = [
  {
    title: "To Approve",
    url: "/approvals/to-approve",
    icon: CheckSquare,
  },
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
    title: "Dashboard",
    url: "/organization-admin",
    icon: Home,
  },
  {
    title: "Business Units",
    url: "/organization-admin/business-units",
    icon: Building2,
  },
  {
    title: "System Templates",
    url: "/organization-admin/system-templates",
    icon: FileText,
  },
  {
    title: "System Workflows",
    url: "/organization-admin/system-workflows",
    icon: ClipboardEdit,
  },
];

export function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    authContext,
    currentBuPermission,
    hasSystemRole,
    hasOrgAdminRole,
    selectedBuId,
    isAuditor,
    isSystemAuditor,
    isBuAuditor,
  } = useSession();

  // Debug: Log auditor status
  if (authContext) {
    console.log("Auditor Debug:", {
      isAuditor,
      isSystemAuditor,
      isBuAuditor,
      bu_permissions: authContext.bu_permissions,
      system_roles: authContext.system_roles,
    });
  }

  // State for Super Admin organization and BU selection
  const [adminSelectedOrgId, setAdminSelectedOrgId] = useState(null);
  const [adminSelectedBuId, setAdminSelectedBuId] = useState(null);

  if (!authContext) {
    // User is logged out, show a minimal state or nothing
    return null;
  }

  const { profile } = authContext;

  // 2. Determine the user's permission level for the currently selected BU
  // A 'MEMBER' is a user in a BU but with no specific role assigned.
  const permissionLevel = currentBuPermission?.permission_level || "MEMBER";

  // Get all BUs the user has access to (for Super Admins and Org Admins, show all their BUs)
  const accessibleBUs = authContext?.bu_permissions || [];

  // Helper function to get middle initial
  const getMiddleInitial = (middleName) => {
    if (!middleName) return null;
    return middleName.charAt(0).toUpperCase() + ".";
  };

  // 3. Construct the full name robustly
  const fullName = [
    profile.first_name,
    getMiddleInitial(profile.middle_name),
    profile.last_name,
  ]
    .filter(Boolean) // Removes any null, undefined, or empty parts
    .join(" "); // Joins the remaining parts with a space

  // Handlers for dropdown actions
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="flex items-center justify-between p-2">
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
        {/* 1. General Section */}
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/dashboard"}>
                  <a href="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Notifications */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/notifications"}>
                  <a href="/notifications">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Chat */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/chat"}>
                  <a href="/chat">
                    <MessagesSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/settings"}>
                  <a href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 2. Organization Admin Section */}
        {hasOrgAdminRole() && (
          <SidebarGroup>
            <AnimatedSection
              title="Organization Admin"
              titleClassName="text-primary"
            >
              <SidebarGroupContent>
                <SidebarMenu>
                  {orgAdminItems.map((item) => {
                    const isActive =
                      item.url === "/organization-admin"
                        ? path === "/organization-admin" ||
                          path.startsWith("/organization-admin?")
                        : path.startsWith(item.url);

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </AnimatedSection>
          </SidebarGroup>
        )}

        {/* 2.5. Audit Section - Visible to auditors */}
        {/* Debug: isAuditor = {String(isAuditor)}, isSystemAuditor = {String(isSystemAuditor)}, isBuAuditor = {String(isBuAuditor)} */}
        {isAuditor && (
          <SidebarGroup>
            <AnimatedSection
              title="Audit"
              titleClassName="text-purple-600 dark:text-purple-400"
            >
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={path.startsWith("/auditor/documents")}
                    >
                      <Link href="/auditor/documents">
                        <FileText className="h-4 w-4" />
                        <span>Documents</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </AnimatedSection>
          </SidebarGroup>
        )}

        {/* 3. Business Unit Specific Sections - For non-Super Admin users */}
        {!hasSystemRole("Super Admin") &&
        ((selectedBuId && currentBuPermission) || hasOrgAdminRole()) ? (
          <SidebarGroup>
            <AnimatedSection
              title={
                currentBuPermission?.business_unit_name || "Business Units"
              }
              titleClassName="text-blue-600 dark:text-blue-400 font-semibold"
            >
              <SidebarGroupContent>
                {/* BU Selector - Inside BU category */}
                <div className="mb-3">
                  <BuSelector />
                </div>
                <SidebarMenu>
                  {/* Requests Dropdown - Visible to Members, Approvers, BU Admins, Org Admins */}
                  {(permissionLevel === "MEMBER" ||
                    permissionLevel === "APPROVER" ||
                    permissionLevel === "BU_ADMIN" ||
                    hasOrgAdminRole()) && (
                    <SidebarMenuItem>
                      <AnimatedSection title="Requests" isNested>
                        <SidebarMenuSub>
                          {requestItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={item.url}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>
                  )}

                  {/* Approvals Dropdown - Visible to Approvers, BU Admins, Org Admins */}
                  {(permissionLevel === "APPROVER" ||
                    permissionLevel === "BU_ADMIN" ||
                    hasOrgAdminRole()) && (
                    <SidebarMenuItem>
                      <AnimatedSection title="Approvals" isNested>
                        <SidebarMenuSub>
                          {approvalItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={item.url}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>
                  )}

                  {/* Management Dropdown - Visible to BU Admins and Org Admins */}
                  {(permissionLevel === "BU_ADMIN" || hasOrgAdminRole()) && (
                    <SidebarMenuItem>
                      <AnimatedSection title="Management" isNested>
                        <SidebarMenuSub>
                          {adminItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={`${item.url}/${selectedBuId}`}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </AnimatedSection>
          </SidebarGroup>
        ) : null}

        {/* 4. System Administration (Visible ONLY to System Admins) */}
        {hasSystemRole("Super Admin") && (
          <SidebarGroup>
            <AnimatedSection
              title="System Admin"
              titleClassName="text-destructive"
            >
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
            </AnimatedSection>
          </SidebarGroup>
        )}

        {/* 5. Business Units Section for Super Admins */}
        {hasSystemRole("Super Admin") && (
          <SidebarGroup>
            <AnimatedSection
              title="Business Units"
              titleClassName="text-blue-600 dark:text-blue-400 font-semibold"
            >
              <SidebarGroupContent>
                {/* Organization Selector for Super Admin */}
                <div className="mb-3">
                  <OrgSelector
                    selectedOrgId={adminSelectedOrgId}
                    onOrgChange={setAdminSelectedOrgId}
                  />
                </div>

                {/* BU Selector for selected organization */}
                {adminSelectedOrgId && (
                  <div className="mb-3">
                    <AdminBuSelector
                      organizationId={adminSelectedOrgId}
                      selectedBuId={adminSelectedBuId}
                      onBuChange={setAdminSelectedBuId}
                    />
                  </div>
                )}

                {/* Show BU-specific options when a BU is selected */}
                {adminSelectedBuId && (
                  <SidebarMenu>
                    {/* Requests Dropdown */}
                    <SidebarMenuItem>
                      <AnimatedSection title="Requests" isNested>
                        <SidebarMenuSub>
                          {requestItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={item.url}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>

                    {/* Approvals Dropdown */}
                    <SidebarMenuItem>
                      <AnimatedSection title="Approvals" isNested>
                        <SidebarMenuSub>
                          {approvalItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={item.url}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>

                    {/* Management Dropdown */}
                    <SidebarMenuItem>
                      <AnimatedSection title="Management" isNested>
                        <SidebarMenuSub>
                          {adminItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={path.startsWith(item.url)}
                              >
                                <Link href={`${item.url}/${adminSelectedBuId}`}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </AnimatedSection>
                    </SidebarMenuItem>
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </AnimatedSection>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group/footer-btn focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={profile.image_url ?? undefined}
                      alt={fullName}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground group-hover/footer-btn:bg-muted group-hover/footer-btn:text-foreground group-data-[state=open]/footer-btn:bg-muted group-data-[state=open]/footer-btn:text-foreground rounded-lg font-semibold transition-colors">
                      {profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{fullName}</span>
                    <span className="truncate text-xs">{profile.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              >
                <DropdownMenuItem onSelect={toggleTheme}>
                  {theme === "dark" ? (
                    <>
                      <Sun />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon />
                      <span>Dark Mode</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/")}>
                  <Home />
                  <span>Landing</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
