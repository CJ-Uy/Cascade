'use client';

import { cn } from '@/lib/utils';

interface RequisitionProgressBarProps {
  currentStep: number;
  totalSteps: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Flagged' | 'Draft';
}

export function RequisitionProgressBar({ currentStep, totalSteps, status }: RequisitionProgressBarProps) {
  const stepsArray = Array.from({ length: totalSteps }, (_, i) => i + 1);

  const getSegmentColor = (stepIndex: number) => {
    if (status === 'Approved') return 'bg-green-500';
    if (status === 'Rejected') return 'bg-red-500';
    if (status === 'Flagged') return 'bg-yellow-500';
    if (status === 'Draft') return 'bg-gray-300';

    if (stepIndex < currentStep) return 'bg-emerald-500'; // Completed steps
    if (stepIndex === currentStep) return 'bg-blue-500'; // Current step
    return 'bg-gray-300'; // Future steps
  };

  return (
    <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-200 gap-0.5">
      {stepsArray.map((step, index) => (
        <div
          key={step}
          className={cn(
            'h-full rounded-sm',
            getSegmentColor(index),
          )}
          style={{ width: `${100 / totalSteps}%` }}
        />
      ))}
    </div>
  );
}
