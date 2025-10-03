'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export interface Employee {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
}

const ITEMS_PER_PAGE = 5; // Define how many items per page

export function EmployeeTable({ employees, onEdit }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [employees, searchTerm]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search employees by name or email..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1); // Reset to first page on search
        }}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmployees.length > 0 ? (
              paginatedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
