"use server";

import { getApproverRequisitions } from "../approvals/actions";
import { getRunningRequisitions } from "../requisitions/create/actions";

export async function getDashboardData(buId: string) {
  const runningReqs = await getRunningRequisitions();
  const approverData = await getApproverRequisitions(buId);

  const recentActivity = runningReqs.slice(0, 5);

  const statusCounts = runningReqs.reduce(
    (acc, req) => {
      const status = req.overallStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    runningCount: runningReqs.length,
    awaitingApprovalCount: approverData.immediate.length,
    onTheWayCount: approverData.onTheWay.length,
    recentActivity: recentActivity,
    chartData: chartData,
  };
}
