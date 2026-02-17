"use client";

import { useState, useTransition } from "react";
import { useParams, usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { EmployeeTable, Employee } from "./(components)/EmployeeTable";
import { EmployeeDialog } from "./(components)/EmployeeDialog";
import { RolesTable, Role } from "./(components)/RolesTable";
import { RoleDialog } from "./(components)/RoleDialog";
import { CreateAccountsClient } from "./create-accounts/(components)/CreateAccountsClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSession } from "@/app/contexts/SessionProvider";

import {
  saveRole,
  deleteRole,
  updateEmployeeRoles,
  removeUserFromBusinessUnit,
} from "../actions";

export default function EmployeesPage() {
  const params = useParams();
  const pathname = usePathname();
  const buId = params.bu_id as string;
  const [isPending, startTransition] = useTransition();
  const [key, setKey] = useState(Date.now());

  const { hasBuPermission, hasSystemRole, hasOrgAdminRole } = useSession();

  // Determine user capabilities
  const isBuHead =
    hasSystemRole("Super Admin") ||
    hasOrgAdminRole() ||
    hasBuPermission("can_manage_employee_roles"); // BU_ADMIN returns true for all perms

  // More precise check: is the user actually BU Head level (not just an assistant)?
  const isBuHeadLevel =
    hasSystemRole("Super Admin") ||
    hasOrgAdminRole() ||
    (() => {
      // hasBuPermission returns true for BU_ADMIN, but we need to distinguish
      // BU Head from assistants. Check if they have ALL permissions (BU Head does).
      // A simpler proxy: check a permission that only BU Head would have
      // Since only BU Head can manage capabilities, we check multiple
      return (
        hasBuPermission("can_manage_employee_roles") &&
        hasBuPermission("can_manage_bu_roles") &&
        hasBuPermission("can_create_accounts") &&
        hasBuPermission("can_reset_passwords") &&
        hasBuPermission("can_manage_forms") &&
        hasBuPermission("can_manage_workflows")
      );
    })();

  const canEditEmployeeRoles =
    hasBuPermission("can_manage_employee_roles") ||
    hasBuPermission("can_create_accounts");
  const canManageBuRoles = hasBuPermission("can_manage_bu_roles");
  const canCreateAccounts = hasBuPermission("can_create_accounts");
  const canResetPasswords = hasBuPermission("can_reset_passwords");

  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = (employeeToSave: Employee) => {
    startTransition(async () => {
      try {
        await updateEmployeeRoles(
          employeeToSave.id,
          employeeToSave.roles,
          buId,
          pathname,
        );
        toast.success("Employee roles updated successfully.");
        setIsEmployeeDialogOpen(false);
        setKey(Date.now());
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleRemoveFromBU = (employee: Employee) => {
    startTransition(async () => {
      try {
        await removeUserFromBusinessUnit(employee.id, buId, pathname);
        toast.success(
          `${employee.name} has been removed from the business unit.`,
        );
        setIsEmployeeDialogOpen(false);
        setKey(Date.now());
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsRoleDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsRoleDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    startTransition(async () => {
      try {
        await deleteRole(role.id, buId, pathname);
        toast.success(`Role "${role.name}" deleted successfully.`);
        setKey(Date.now());
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleSaveRole = (role: Omit<Role, "id"> & { id?: string }) => {
    startTransition(async () => {
      try {
        await saveRole(role, buId, pathname);
        toast.success(`Role "${role.name}" saved successfully.`);
        setIsRoleDialogOpen(false);
        setKey(Date.now());
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Employee Management" />
      <p className="text-muted-foreground mb-8">
        Manage employees, assign roles, and oversee business unit personnel.
      </p>

      <Tabs defaultValue="current-employees" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="current-employees">Employees</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            {canCreateAccounts && (
              <TabsTrigger value="create-accounts">New Accounts</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="current-employees" className="mt-4">
          <EmployeeTable
            businessUnitId={buId}
            onEdit={handleEditEmployee}
            refreshKey={key}
            canEdit={canEditEmployeeRoles}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <RolesTable
            businessUnitId={buId}
            onEdit={handleEditRole}
            onCreate={handleCreateRole}
            refreshKey={key}
            canManageRoles={canManageBuRoles}
            isBuHead={isBuHeadLevel}
          />
        </TabsContent>

        {canCreateAccounts && (
          <TabsContent value="create-accounts" className="mt-4">
            <CreateAccountsClient
              businessUnitId={buId}
              isBuHead={isBuHeadLevel}
            />
          </TabsContent>
        )}
      </Tabs>

      <EmployeeDialog
        isOpen={isEmployeeDialogOpen}
        onClose={() => setIsEmployeeDialogOpen(false)}
        onSave={handleSaveEmployee}
        onRemoveFromBU={handleRemoveFromBU}
        employee={selectedEmployee}
        businessUnitId={buId}
        isBuHead={isBuHeadLevel}
        canResetPasswords={canResetPasswords}
      />

      <RoleDialog
        isOpen={isRoleDialogOpen}
        onClose={() => setIsRoleDialogOpen(false)}
        onSave={handleSaveRole}
        onDelete={handleDeleteRole}
        role={selectedRole}
        isBuHead={isBuHeadLevel}
      />
    </div>
  );
}
