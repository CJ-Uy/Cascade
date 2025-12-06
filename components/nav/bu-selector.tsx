"use client";

import { useSession } from "@/app/contexts/SessionProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function BuSelector() {
  const {
    authContext,
    selectedBuId,
    setSelectedBuId,
    hasSystemRole,
    hasOrgAdminRole,
  } = useSession();

  // Get all BUs the user has access to
  const allBUs = authContext?.bu_permissions || [];

  // Don't show the selector if the user has no BUs
  if (allBUs.length === 0) {
    return null;
  }

  // For Super Admins and Org Admins, always show the selector
  // For regular users, only show if they have access to multiple BUs
  const shouldShowSelector =
    hasSystemRole("Super Admin") || hasOrgAdminRole() || allBUs.length > 1;

  if (!shouldShowSelector) {
    return null;
  }

  // Get label based on user role
  let selectorLabel = `${allBUs.length} Business Unit${allBUs.length === 1 ? "" : "s"}`;
  if (hasSystemRole("Super Admin")) {
    selectorLabel = `System: ${allBUs.length} BU${allBUs.length === 1 ? "" : "s"}`;
  } else if (hasOrgAdminRole()) {
    selectorLabel = `Organization: ${allBUs.length} BU${allBUs.length === 1 ? "" : "s"}`;
  }

  return (
    <div className="px-2">
      <Select value={selectedBuId || ""} onValueChange={setSelectedBuId}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Select Business Unit" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {allBUs.map((bu) => (
            <SelectItem key={bu.business_unit_id} value={bu.business_unit_id}>
              <div className="flex items-center gap-2">
                <span>{bu.business_unit_name}</span>
                {bu.permission_level === "BU_ADMIN" && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    (Admin)
                  </span>
                )}
                {bu.permission_level === "APPROVER" && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    (Approver)
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground mt-1 text-xs">{selectorLabel}</p>
    </div>
  );
}
