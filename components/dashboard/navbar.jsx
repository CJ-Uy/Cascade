"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/app/contexts/SessionProvider";

import { Home, MessagesSquare, Settings } from "lucide-react";
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

import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggleButton } from "@/components/dashboard/themeToggle";
import { getMiddleInitial } from "@/lib/utils";

// Menu items.
const items = [
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

export function Navbar() {
  const path = usePathname();

  const { authContext, currentBuPermission, hasSystemRole } = useSession();

  if (!authContext) {
    return (
      <div className="rounded border p-4">
        <p>You are not logged in.</p>
        <a href="/auth/login" className="text-blue-500 hover:underline">
          Login
        </a>
      </div>
    );
  }

  const { profile } = authContext;

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

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
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
                  {`${profile.first_name}${getMiddleInitial(profile.middle_name)}${profile.last_name}`}
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
