'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboardHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { EmployeeTable, Employee } from '@/components/management/employees/EmployeeTable';
import { EmployeeDialog } from '@/components/management/employees/EmployeeDialog';
import { NoRolePeopleTable, NoRolePerson } from '@/components/management/employees/NoRolePeopleTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Dummy data
const dummyEmployeesData: Employee[] = [
  {
    id: 'emp_001',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    roles: ['Employee', 'Manager'],
  },
  {
    id: 'emp_002',
    name: 'Bob Smith',
    email: 'bob.s@example.com',
    roles: ['Employee', 'IT Department'],
  },
  {
    id: 'emp_003',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    roles: ['Employee', 'HR Department'],
  },
];

const dummyNoRolePeopleData: NoRolePerson[] = [
  {
    id: 'person_001',
    name: 'David Lee',
    email: 'david.l@example.com',
  },
  {
    id: 'person_002',
    name: 'Eva Green',
    email: 'eva.g@example.com',
  },
  {
    id: 'person_003',
    name: 'Frank White',
    email: 'frank.w@example.com',
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(dummyEmployeesData);
  const [noRolePeople, setNoRolePeople] = useState<NoRolePerson[]>(dummyNoRolePeopleData);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = (employeeToSave: Employee) => {
    if (employeeToSave.id.startsWith('emp_')) { // Existing employee
      setEmployees(employees.map(emp => emp.id === employeeToSave.id ? employeeToSave : emp));
    } else { // New employee
      setEmployees([...employees, { ...employeeToSave, id: `emp_${Date.now()}` }]);
    }
    setIsEmployeeDialogOpen(false);
  };

  const handleAddToBu = (person: NoRolePerson) => {
    // Add to employees with a default role (e.g., 'Employee')
    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      name: person.name,
      email: person.email,
      roles: ['Employee'], // Default role
    };
    setEmployees([...employees, newEmployee]);
    // Remove from no-role people list
    setNoRolePeople(noRolePeople.filter(p => p.id !== person.id));
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Employee Management" />
      <p className="mb-8 text-muted-foreground">
        Manage employees, assign roles, and oversee business unit personnel.
      </p>

      <Tabs defaultValue="current-employees" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="current-employees">Current Employees</TabsTrigger>
            <TabsTrigger value="no-role-people">Find People to Add</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="current-employees" className="mt-4">
          <EmployeeTable
            employees={employees}
            onEdit={handleEditEmployee}
          />
        </TabsContent>

        <TabsContent value="no-role-people" className="mt-4">
          <NoRolePeopleTable
            people={noRolePeople}
            onAddToBu={handleAddToBu}
          />
        </TabsContent>
      </Tabs>

      <EmployeeDialog
        isOpen={isEmployeeDialogOpen}
        onClose={() => setIsEmployeeDialogOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
      />
    </div>
  );
}
