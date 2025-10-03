"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Templates() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Forms Management" />

      <div className="flex w-[80%] flex-col">
        Should be able to: (a) Create Forms w/ different types of text fields
        kinda like a CMS (b) Select who has access to the forms, this can also
        be done in approval-system but redundancy is good here!
      </div>
    </div>
  );
}
