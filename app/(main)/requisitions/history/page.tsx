'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboardHeader';
import { RequisitionTable, Requisition } from '@/components/requisitions/RequisitionTable';
import { RequisitionDetailsDialog } from '@/components/requisitions/RequisitionDetailsDialog';
import { Button } from '@/components/ui/button';

// Dummy data for requisition history
const dummyHistoryRequisitions: Requisition[] = [
  {
    id: 'req_004',
    title: 'Office Supplies Order',
    formName: 'General Purchase Request',
    initiator: 'Bob Smith',
    currentApprover: 'N/A',
    status: 'Approved',
    currentStep: 3,
    totalSteps: 3,
    submittedDate: '2023-09-15',
    lastUpdated: '2023-09-20',
  },
  {
    id: 'req_005',
    title: 'New Employee Onboarding - Jane Doe',
    formName: 'HR Onboarding Form',
    initiator: 'Charlie Brown',
    currentApprover: 'N/A',
    status: 'Rejected',
    currentStep: 1,
    totalSteps: 2,
    submittedDate: '2023-09-01',
    lastUpdated: '2023-09-05',
  },
  {
    id: 'req_006',
    title: 'Travel Request - Conference',
    formName: 'Travel Authorization',
    initiator: 'Alice Johnson',
    currentApprover: 'N/A',
    status: 'Approved',
    currentStep: 4,
    totalSteps: 4,
    submittedDate: '2023-10-01',
    lastUpdated: '2023-10-10',
  },
];

export default function RequisitionHistoryPage() {
  const [historyRequisitions, setHistoryRequisitions] = useState<Requisition[]>(dummyHistoryRequisitions);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  // Define columns for the requisition history table
  const historyRequisitionColumns = [
    { key: 'title', header: 'Title' },
    { key: 'formName', header: 'Form' },
    { key: 'initiator', header: 'Initiator' },
    { key: 'status', header: 'Status' },
    { key: 'progress', header: 'Progress' },
    { key: 'submittedDate', header: 'Submitted' },
    {
      key: 'actions',
      header: 'Actions',
      render: (requisition: Requisition) => (
        <Button variant="outline" size="sm" onClick={() => handleViewDetails(requisition)}>
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Requisition History" />
      <p className="mb-8 text-muted-foreground">
        View a history of all requisitions you have initiated, including completed and rejected ones.
      </p>

      <RequisitionTable
        requisitions={historyRequisitions}
        columns={historyRequisitionColumns}
        onViewDetails={handleViewDetails}
      />

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
      />
    </div>
  );
}