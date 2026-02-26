"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from "lucide-react";
import type { OrganizationPerson } from "../actions";

export function PeopleClient({ people }: { people: OrganizationPerson[] }) {
  const [search, setSearch] = useState("");

  const filtered = people.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      p.business_units.some((bu) => bu.toLowerCase().includes(q)) ||
      p.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>
          All members in your organization across all business units
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Search className="text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, username, business unit, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-muted-foreground ml-auto text-sm">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Business Units</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {search ? "No results found" : "No members found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      @{person.username}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {person.business_units.map((bu) => (
                          <Badge key={bu} variant="secondary">
                            {bu}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {person.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
