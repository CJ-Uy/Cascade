// src/components/sidebar/menu-items.js (or a similar location)
import {
  CheckSquare,
  ChevronRight,
  FileText,
  History,
  LayoutGrid,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react";

// Define all possible menu items for a business unit
export const buMenuItems = [
  {
    key: "to-approve",
    title: "To Approve",
    icon: CheckSquare,
    url: (buId) => `/bu/${buId}/approve`,
  },
  {
    key: "create",
    title: "Create",
    icon: PlusCircle,
    url: (buId) => `/bu/${buId}/create`,
  },
  {
    key: "running",
    title: "Running",
    icon: ChevronRight, // Using ChevronRight as a stand-in for a 'play' icon
    url: (buId) => `/bu/${buId}/running`,
  },
  {
    key: "history",
    title: "History",
    icon: History,
    url: (buId) => `/bu/${buId}/history`,
  },
  {
    key: "employees",
    title: "Employees",
    icon: Users,
    url: (buId) => `/bu/${buId}/employees`,
  },
  {
    key: "approval-system",
    title: "Approval System",
    icon: Settings,
    url: (buId) => `/bu/${buId}/approval-system`,
  },
  {
    key: "templates",
    title: "Templates",
    icon: FileText,
    url: (buId) => `/bu/${buId}/templates`,
  },
  // You can add more items here
];
