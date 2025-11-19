"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BusinessUnit {
  id: string;
  name: string;
  head_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface BusinessUnitsSectionProps {
  organizationId: string;
  businessUnits: BusinessUnit[];
}

export function BusinessUnitsSection({
  organizationId,
  businessUnits,
}: BusinessUnitsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Business Units</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {businessUnits.length}{" "}
              {businessUnits.length === 1 ? "business unit" : "business units"}
            </p>
          </div>
          <Button asChild>
            <Link
              href={`/admin/organizations/${organizationId}/business-units/new`}
            >
              Add Business Unit
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {businessUnits.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessUnits.map((bu) => (
                <TableRow key={bu.id}>
                  <TableCell className="font-medium">{bu.name}</TableCell>
                  <TableCell>
                    {bu.profiles
                      ? `${bu.profiles.first_name || ""} ${bu.profiles.last_name || ""}`.trim() ||
                        "Unknown"
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {bu.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/admin/organizations/${organizationId}/business-units/${bu.id}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center">
            No business units found. Create one to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
