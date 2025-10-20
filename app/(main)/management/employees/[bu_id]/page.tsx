"use client";

import { useState, useTransition } from "react";
import { useParams, usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { EmployeeTable, Employee } from "./(components)/EmployeeTable";
import { EmployeeDialog } from "./(components)/EmployeeDialog";
import {
  NoRolePeopleTable,
  NoRolePerson,
} from "./(components)/NoRolePeopleTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleDialog } from "./(components)/RoleDialog";
import { RolesTable, Role } from "./(components)/RolesTable";
import {
  addUserToBusinessUnit,
  updateEmployeeRoles,
  saveRole,
  deleteRole,
  removeUserFromBusinessUnit,
} from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function EmployeesPage() {
  const params = useParams();
  const pathname = usePathname();
  const buId = params.bu_id as string;
  const [isPending, startTransition] = useTransition();
  const [key, setKey] = useState(Date.now());

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

  const handleAddToBu = (person: NoRolePerson) => {
    startTransition(async () => {
      try {
        await addUserToBusinessUnit(person.id, buId, pathname);
        toast.success(`${person.name} has been added to the business unit.`);
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
        await deleteRole(role.id, pathname);
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

      <Tabs defaultValue="roles" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="current-employees">Current</TabsTrigger>
            <TabsTrigger value="no-role-people">Add</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="roles" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={handleCreateRole}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
          <RolesTable
            businessUnitId={buId}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
            key={key}
          />
        </TabsContent>

        <TabsContent value="current-employees" className="mt-4">
          <EmployeeTable
            businessUnitId={buId}
            onEdit={handleEditEmployee}
            key={key}
          />
        </TabsContent>

        <TabsContent value="no-role-people" className="mt-4">
          <NoRolePeopleTable
            businessUnitId={buId}
            onAddToBu={handleAddToBu}
            key={key}
          />
        </TabsContent>
      </Tabs>

      <EmployeeDialog
        isOpen={isEmployeeDialogOpen}
        onClose={() => setIsEmployeeDialogOpen(false)}
        onSave={handleSaveEmployee}
        onRemoveFromBU={handleRemoveFromBU}
        employee={selectedEmployee}
        businessUnitId={buId}
      />

      <RoleDialog
        isOpen={isRoleDialogOpen}
        onClose={() => setIsRoleDialogOpen(false)}
        onSave={handleSaveRole}
        onDelete={handleDeleteRole}
        role={selectedRole}
      />
    </div>
  );
}
