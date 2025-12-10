"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

// 1. Define the TypeScript types for our auth data. This gives us autocompletion.
type SystemRole = "Super Admin" | "AUDITOR" | string; // Allow other string values

export type BuPermission = {
  business_unit_id: string;
  business_unit_name: string;
  permission_level: "BU_ADMIN" | "APPROVER" | "MEMBER" | "AUDITOR";
  role?: { id: string; name: string };
};

export type AuthContextType = {
  user_id: string;
  profile: {
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    image_url: string | null;
  } | null;
  system_roles: SystemRole[];
  organization_roles: string[];
  bu_permissions: BuPermission[];
};

// 2. Define the shape of the context's value, including state setters
type SessionContextValue = {
  authContext: AuthContextType | null;
  selectedBuId: string | null;
  setSelectedBuId: (id: string | null) => void;
  currentBuPermission: BuPermission | undefined; // The permission for the selected BU
  hasSystemRole: (role: SystemRole) => boolean;
  hasOrgAdminRole: () => boolean;
  isSystemAuditor: boolean;
  isBuAuditor: boolean;
  isAuditor: boolean;
};

// 3. Create the context with a default value of null
const SessionContext = createContext<SessionContextValue | null>(null);

// 4. Create the Provider component
export function SessionProvider({
  children,
  initialAuthContext,
}: {
  children: ReactNode;
  initialAuthContext: AuthContextType | null;
}) {
  const [selectedBuId, setSelectedBuId] = useState<string | null>(
    // Default to the first BU permission if it exists
    initialAuthContext?.bu_permissions?.[0]?.business_unit_id || null,
  );

  // Memoize derived values to prevent unnecessary re-renders
  const value = useMemo(() => {
    // Find the full permission object for the currently selected BU
    const currentBuPermission = initialAuthContext?.bu_permissions.find(
      (p) => p.business_unit_id === selectedBuId,
    );

    // Helper function to check for system roles
    const hasSystemRole = (role: SystemRole): boolean => {
      return initialAuthContext?.system_roles?.includes(role) ?? false;
    };

    const hasOrgAdminRole = (): boolean => {
      return (
        initialAuthContext?.organization_roles?.includes(
          "Organization Admin",
        ) ?? false
      );
    };

    // Auditor helpers
    const isSystemAuditor = hasSystemRole("AUDITOR");
    // Check if user is a BU auditor in ANY of their BUs (not just the selected one)
    const isBuAuditor =
      initialAuthContext?.bu_permissions?.some(
        (p) => p.permission_level === "AUDITOR",
      ) ?? false;
    const isAuditor = isSystemAuditor || isBuAuditor;

    return {
      authContext: initialAuthContext,
      selectedBuId,
      setSelectedBuId,
      currentBuPermission,
      hasSystemRole,
      hasOrgAdminRole,
      isSystemAuditor,
      isBuAuditor,
      isAuditor,
    };
  }, [initialAuthContext, selectedBuId]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// 5. Create a custom hook for easy consumption in client components
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
