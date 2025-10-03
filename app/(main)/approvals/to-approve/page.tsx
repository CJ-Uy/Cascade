'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboardHeader';
import { RequisitionTable, Requisition } from '@/components/requisitions/RequisitionTable';
import { RequisitionDetailsDialog } from '@/components/requisitions/RequisitionDetailsDialog';
import { Button } from '@/components/ui/button';
import { Check, X, Flag } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Dummy data for requisitions to approve
const dummyToApproveRequisitions: Requisition[] = [
  {
    id: 'req_007',
    title: 'New Monitor Request',
    formName: 'IT Hardware Request Form',
    initiator: 'Bob Smith',
    currentApprover: 'You',
    status: 'Pending',
    currentStep: 1,
    totalSteps: 3,
    submittedDate: '2023-10-28',
    lastUpdated: '2023-10-28',
  },
  {
    id: 'req_008',
    title: 'Travel Request - Sales Meeting',
    formName: 'Travel Authorization',
    initiator: 'Eva Green',
    currentApprover: 'You',
    status: 'Pending',
    currentStep: 0,
    totalSteps: 2,
    submittedDate: '2023-10-29',
    lastUpdated: '2023-10-29',
  },
];

export default function ToApproveRequisitionsPage() {
  const [toApproveRequisitions, setToApproveRequisitions] = useState<Requisition[]>(dummyToApproveRequisitions);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'flag' | null>(null);

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  const handleAction = (requisition: Requisition, type: 'approve' | 'reject' | 'flag') => {
    setSelectedRequisition(requisition);
    setActionType(type);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedRequisition || !actionType) return;

    let newStatus: Requisition['status'];
    let newCurrentStep = selectedRequisition.currentStep;

    if (actionType === 'approve') {
      newCurrentStep++;
      if (newCurrentStep >= selectedRequisition.totalSteps) {
        newStatus = 'Approved';
      } else {
        newStatus = 'Pending'; // Still pending, but moved to next step
      }
    } else if (actionType === 'reject') {
      newStatus = 'Rejected';
    } else if (actionType === 'flag') {
      newStatus = 'Flagged';
    } else {
      newStatus = 'Pending'; // Default
    }

    const updatedRequisition = {
      ...selectedRequisition,
      status: newStatus,
      currentStep: newCurrentStep,
      lastUpdated: new Date().toISOString().split('T')[0], // Simple date update
    };

    // Update the list (remove from to-approve if approved/rejected/flagged)
    setToApproveRequisitions(prev => prev.filter(req => req.id !== selectedRequisition.id));
    // In a real app, you'd update the backend and potentially add to other lists (e.g., history, flagged)

    setIsConfirmDialogOpen(false);
    setSelectedRequisition(null);
    setActionType(null);
  };

  // Define columns for the requisitions to approve table
  const toApproveRequisitionColumns = [
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleViewDetails(requisition)}>
            View Details
          </Button>
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(requisition, 'approve')}>
            <Check className="mr-2 h-4 w-4" /> Approve
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleAction(requisition, 'reject')}>
            <X className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleAction(requisition, 'flag')}>
            <Flag className="mr-2 h-4 w-4" /> Flag
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Requisitions to Approve" />
      <p className="mb-8 text-muted-foreground">
        Review and take action on requisitions awaiting your approval.
      </p>

      <RequisitionTable
        requisitions={toApproveRequisitions}
        columns={toApproveRequisitionColumns}
        onViewDetails={handleViewDetails}
      />

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
      />

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} "{selectedRequisition?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className={
              actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
              actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
              actionType === 'flag' ? 'bg-yellow-600 hover:bg-yellow-700' : ''
            }>
              Confirm {actionType}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}