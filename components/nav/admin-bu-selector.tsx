"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BusinessUnit = {
  id: string;
  name: string;
};

type AdminBuSelectorProps = {
  organizationId: string | null;
  selectedBuId: string | null;
  onBuChange: (buId: string | null) => void;
};

export function AdminBuSelector({
  organizationId,
  selectedBuId,
  onBuChange,
}: AdminBuSelectorProps) {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinessUnits() {
      if (!organizationId) {
        setBusinessUnits([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("business_units")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");

      if (!error && data) {
        setBusinessUnits(data);
        // Auto-select first BU if none selected or if current selection is not in this org
        const currentBuExists = data.some((bu) => bu.id === selectedBuId);
        if (data.length > 0 && !currentBuExists) {
          onBuChange(data[0].id);
        }
      }
      setLoading(false);
    }

    fetchBusinessUnits();
  }, [organizationId, selectedBuId, onBuChange]);

  if (loading || !organizationId || businessUnits.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 px-2">
      <Select value={selectedBuId || ""} onValueChange={onBuChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Select Business Unit" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {businessUnits.map((bu) => (
            <SelectItem key={bu.id} value={bu.id}>
              {bu.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground mt-1 text-xs">
        {businessUnits.length} Business Unit
        {businessUnits.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
