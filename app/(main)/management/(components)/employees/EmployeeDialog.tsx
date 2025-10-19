"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Save } from "lucide-react";
import { Employee } from "./EmployeeTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  employee: Employee | null; // Null for create, Employee for edit
}

// Dummy available roles for selection
const allAvailableRoles = [
  "Employee",
  "Manager",
  "Department Head",
  "IT Department",
  "HR Department",
  "Finance",
  "CEO",
  "BU Head",
];

export function EmployeeDialog({
  isOpen,
  onClose,
  onSave,
  employee,
}: EmployeeDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setName(employee.name);
        setEmail(employee.email);
        setSelectedRoles(employee.roles);
      } else {
        // Reset for new employee
        setName("");
        setEmail("");
        setSelectedRoles([]);
      }
    }
  }, [isOpen, employee]);

  const handleSave = () => {
    if (!name || !email) {
      alert("Name and Email are required.");
      return;
    }
    // Show confirmation dialog before saving
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = () => {
    const employeeToSave: Employee = {
      id: employee?.id || `emp_${Date.now()}`,
      name,
      email,
      roles: selectedRoles,
    };
    onSave(employeeToSave);
    setShowSaveConfirm(false);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {employee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? `Editing roles for ${employee.name}.`
                : "Add a new employee to your business unit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                disabled={!!employee} // Disable if employee prop exists
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                disabled={!!employee} // Disable if employee prop exists
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="pt-2 text-right">Roles</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {allAvailableRoles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label htmlFor={`role-${role}`}>{role}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to the employee's
              roles?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
