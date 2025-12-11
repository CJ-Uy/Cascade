"use client";

import { format } from "date-fns";
import { History } from "lucide-react";

interface ApprovalHistoryProps {
  history: Array<{
    id: string;
    action: string;
    actor_first_name: string;
    actor_last_name: string;
    comments?: string | null;
    created_at: string;
  }>;
}

// Simple timeline component
const Timeline = ({ children }: { children: React.ReactNode }) => (
  <div className="border-border space-y-6 border-l-2 pl-4">{children}</div>
);

const TimelineItem = ({ children }: { children: React.ReactNode }) => (
  <div className="before:bg-primary relative before:absolute before:top-2 before:left-[-21px] before:h-2 before:w-2 before:rounded-full">
    {children}
  </div>
);

export function ApprovalHistory({ history }: ApprovalHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No history available
      </p>
    );
  }

  return (
    <Timeline>
      {history.map((item) => (
        <TimelineItem key={item.id}>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{item.action}</p>
            <p className="text-muted-foreground text-xs">
              by {item.actor_first_name} {item.actor_last_name}
            </p>
            {item.comments && (
              <p className="text-muted-foreground mt-2 border-l-2 pl-2 text-sm italic">
                "{item.comments}"
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
