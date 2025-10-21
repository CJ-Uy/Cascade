"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { getDashboardData } from "./actions";
import { toast } from "sonner";
import { Requisition } from "@/lib/types/requisition";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Clock,
  FileCheck2,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

interface DashboardData {
  runningCount: number;
  awaitingApprovalCount: number;
  onTheWayCount: number;
  recentActivity: Requisition[];
  chartData: { name: string; value: number }[];
}

const CHART_COLORS = {
  PENDING: "#facc15", // yellow-400
  IN_REVISION: "#fb923c", // orange-400
  APPROVED: "#4ade80", // green-400
};

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const buId = params.bu_id as string; // Assuming bu_id is in the route

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (buId) {
      startLoading(async () => {
        try {
          const dashboardData = await getDashboardData(buId);
          setData(dashboardData);
        } catch (error) {
          toast.error("Failed to load dashboard data.");
        }
      });
    }
  }, [buId]);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (loading || !data) {
    return (
      <div className="p-4 md:p-8">
        <DashboardHeader title="Dashboard" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="h-96 lg:col-span-4" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => navigateTo(`/requisitions/running/${buId}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              My Running Requisitions
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.runningCount}</div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => navigateTo(`/approvals/to-approve/${buId}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting My Approval
            </CardTitle>
            <FileCheck2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.awaitingApprovalCount}
            </div>
            <p className="text-muted-foreground text-xs">
              Ready for your review
            </p>
          </CardContent>
        </Card>
        <Card
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => navigateTo(`/approvals/to-approve/${buId}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On The Way To Me
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.onTheWayCount}</div>
            <p className="text-muted-foreground text-xs">
              In prior approval steps
            </p>
          </CardContent>
        </Card>
        <Card
          className="text-primary-foreground flex flex-col items-center justify-center bg-emerald-500 hover:bg-emerald-600"
          onClick={() => navigateTo(`/requisitions/create/${buId}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Create New</CardTitle>
          </CardHeader>
          <CardContent>
            <PlusCircle className="h-10 w-10" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>My Recent Activity</CardTitle>
            <CardDescription>
              A look at your 5 most recently updated running requisitions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{req.formName}</p>
                      <p className="text-muted-foreground text-sm">
                        Status: {req.overallStatus} - Last updated:{" "}
                        {req.lastUpdated}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigateTo(`/requisitions/running/${buId}`)
                      }
                    >
                      View <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No recent activity.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Running Requisitions Status</CardTitle>
            <CardDescription>
              A breakdown of your currently active requisitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.chartData.length > 0 ? (
              <ChartContainer config={{}} className="h-60 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={data.chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                  >
                    {data.chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          CHART_COLORS[
                            entry.name as keyof typeof CHART_COLORS
                          ] || "#8884d8"
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center">
                No data to display.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
