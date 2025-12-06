"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Organization = {
  id: string;
  name: string;
};

type OrgSelectorProps = {
  selectedOrgId: string | null;
  onOrgChange: (orgId: string | null) => void;
};

export function OrgSelector({ selectedOrgId, onOrgChange }: OrgSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganizations() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (!error && data) {
        setOrganizations(data);
        // Auto-select first org if none selected
        if (!selectedOrgId && data.length > 0) {
          onOrgChange(data[0].id);
        }
      }
      setLoading(false);
    }

    fetchOrganizations();
  }, [selectedOrgId, onOrgChange]);

  if (loading || organizations.length === 0) {
    return null;
  }

  return (
    <div className="px-2">
      <Select value={selectedOrgId || ""} onValueChange={onOrgChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <SelectValue placeholder="Select Organization" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground mt-1 text-xs">
        {organizations.length} Organization
        {organizations.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
