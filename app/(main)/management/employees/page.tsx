"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Employees() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Employee Management" />

      <div className="flex w-[80%] flex-col">
        Should be able to: (a) Create new Roles for the BU (b) Add and Remove
        people from the BU (c) Assign and unassign people roles
      </div>
    </div>
  );
}
