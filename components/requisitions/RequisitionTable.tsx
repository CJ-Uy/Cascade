"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequisitionProgressBar } from "./RequisitionProgressBar";

export interface Requisition {
  id: string;
  title: string;
  formName: string;
  initiator: string;
  currentApprover: string;
  status: "Pending" | "Approved" | "Rejected" | "Flagged" | "Draft";
  currentStep: number;
  totalSteps: number;
  submittedDate: string;
  lastUpdated: string;
  // Add other fields as needed
}

interface RequisitionTableProps {
  requisitions: Requisition[];
  columns: {
    key: keyof Requisition | "actions" | "progress";
    header: string;
    render?: (requisition: Requisition) => React.ReactNode;
  }[];
  onViewDetails: (requisition: Requisition) => void;
  // Add other action handlers as needed for specific pages
  onApprove?: (requisition: Requisition) => void;
  onReject?: (requisition: Requisition) => void;
  onFlag?: (requisition: Requisition) => void;
  onWithdraw?: (requisition: Requisition) => void;
}

const ITEMS_PER_PAGE = 5;

export function RequisitionTable({
  requisitions,
  columns,
  onViewDetails,
  onApprove,
  onReject,
  onFlag,
  onWithdraw,
}: RequisitionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(
      (req) =>
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.formName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.initiator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.status.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [requisitions, searchTerm]);

  const totalPages = Math.ceil(filteredRequisitions.length / ITEMS_PER_PAGE);
  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRequisitions.slice(startIndex, endIndex);
  }, [filteredRequisitions, currentPage]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search requisitions..."
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
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.key === "actions" ? "text-right" : ""}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequisitions.length > 0 ? (
              paginatedRequisitions.map((requisition) => (
                <TableRow key={requisition.id}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={column.key === "actions" ? "text-right" : ""}
                    >
                      {column.render ? (
                        column.render(requisition)
                      ) : column.key === "progress" ? (
                        <RequisitionProgressBar
                          currentStep={requisition.currentStep}
                          totalSteps={requisition.totalSteps}
                          status={requisition.status}
                        />
                      ) : column.key === "status" ? (
                        <Badge
                          variant={
                            requisition.status === "Approved"
                              ? "default"
                              : requisition.status === "Rejected"
                                ? "destructive"
                                : requisition.status === "Pending"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {requisition.status}
                        </Badge>
                      ) : (
                        requisition[column.key as keyof Requisition]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No requisitions found.
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
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
