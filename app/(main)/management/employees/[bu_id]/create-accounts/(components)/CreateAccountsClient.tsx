"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  Plus,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import * as XLSX from "xlsx";
import {
  massCreateAccounts,
  validateUsername,
  getRolesForBu,
  type CreateAccountInput,
  type CreateAccountResult,
} from "../actions";
import { getEmployees } from "../../../actions";

type PasswordCharset = {
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

type AccountRow = CreateAccountInput & {
  id: string;
  usernameError?: string;
  usernameChecking?: boolean;
};

// Helper: check if a role is a "member-type" role (no capabilities, not BU Head)
function isMemberTypeRole(role: any): boolean {
  return (
    !role.is_bu_admin &&
    !role.can_manage_employee_roles &&
    !role.can_manage_bu_roles &&
    !role.can_create_accounts &&
    !role.can_reset_passwords &&
    !role.can_manage_forms &&
    !role.can_manage_workflows
  );
}

export function CreateAccountsClient({
  businessUnitId,
  isBuHead = false,
}: {
  businessUnitId: string;
  isBuHead?: boolean;
}) {
  const [rows, setRows] = useState<AccountRow[]>([createEmptyRow()]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<CreateAccountResult[] | null>(null);
  const [passwordLength, setPasswordLength] = useState(() => {
    if (typeof window === "undefined") return 8;
    const saved = localStorage.getItem("pw-settings-length");
    return saved ? parseInt(saved, 10) : 8;
  });
  const [passwordCharset, setPasswordCharset] = useState<PasswordCharset>(
    () => {
      if (typeof window === "undefined")
        return {
          lowercase: true,
          uppercase: true,
          numbers: true,
          symbols: false,
        };
      const saved = localStorage.getItem("pw-settings-charset");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
      return {
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: false,
      };
    },
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getRolesForBu(businessUnitId).then((allRoles) => {
      // Non-BU-Head users can only assign member-type roles
      const filtered = isBuHead ? allRoles : allRoles.filter(isMemberTypeRole);
      setRoles(filtered);
    });
  }, [businessUnitId, isBuHead]);

  useEffect(() => {
    localStorage.setItem("pw-settings-length", String(passwordLength));
  }, [passwordLength]);

  useEffect(() => {
    localStorage.setItem(
      "pw-settings-charset",
      JSON.stringify(passwordCharset),
    );
  }, [passwordCharset]);

  function createEmptyRow(): AccountRow {
    return {
      id: crypto.randomUUID(),
      username: "",
      first_name: "",
      last_name: "",
      password: "",
      role_id: undefined,
    };
  }

  function buildCharPool(charset: PasswordCharset): string {
    let pool = "";
    if (charset.lowercase) pool += "abcdefghijkmnopqrstuvwxyz";
    if (charset.uppercase) pool += "ABCDEFGHJKLMNPQRSTUVWXYZ";
    if (charset.numbers) pool += "23456789";
    if (charset.symbols) pool += "!@#$%&*";
    return pool || "abcdefghijkmnopqrstuvwxyz";
  }

  function generatePassword(): string {
    const pool = buildCharPool(passwordCharset);
    let password = "";
    for (let i = 0; i < passwordLength; i++) {
      password += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    return password;
  }

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  };

  const updateRow = (id: string, field: keyof AccountRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const checkUsername = useCallback(
    async (id: string, username: string) => {
      if (!username || username.length < 3) return;

      // Check for duplicates within the current batch
      const hasBatchDuplicate = rows.some(
        (r) =>
          r.id !== id && r.username.toLowerCase() === username.toLowerCase(),
      );
      if (hasBatchDuplicate) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  usernameChecking: false,
                  usernameError: "Duplicate in batch",
                }
              : r,
          ),
        );
        return;
      }

      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, usernameChecking: true } : r)),
      );
      const result = await validateUsername(username);
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                usernameChecking: false,
                usernameError: result.available
                  ? undefined
                  : result.error || "Username taken",
              }
            : r,
        ),
      );
    },
    [rows],
  );

  const generateAllPasswords = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        password: r.password || generatePassword(),
      })),
    );
  };

  const parseFileRows = (data: string[][]): AccountRow[] => {
    // Skip header row if it looks like one
    const startIdx = data[0]?.[0]?.toLowerCase().includes("username") ? 1 : 0;
    const newRows: AccountRow[] = [];

    for (let i = startIdx; i < data.length; i++) {
      const cols = data[i];
      if (cols.length >= 3 && cols[0]?.trim()) {
        newRows.push({
          id: crypto.randomUUID(),
          username: (cols[0]?.trim() || "").toLowerCase().replace(/\s/g, ""),
          first_name: cols[1]?.trim() || "",
          last_name: cols[2]?.trim() || "",
          password: cols[3]?.trim() || generatePassword(),
          role_id: undefined,
        });
      }
    }
    return newRows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        });
        const newRows = parseFileRows(data);
        if (newRows.length > 0) setRows(newRows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const data = lines.map((line) => line.split(","));
        const newRows = parseFileRows(data);
        if (newRows.length > 0) setRows(newRows);
      };
      reader.readAsText(file);
    }

    e.target.value = "";
  };

  const handleExportEmployees = async () => {
    setIsExporting(true);
    try {
      const employees = await getEmployees(businessUnitId);
      const exportData = employees.map((emp) => ({
        Username: emp.username,
        Name: emp.name,
        Roles: emp.roles.join(", "),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Username
        { wch: 30 }, // Name
        { wch: 40 }, // Roles
      ];
      ws["!cols"] = colWidths;

      XLSX.writeFile(
        wb,
        `employees-export-${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch {
      // silently fail
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportResults = () => {
    if (!results) return;
    const exportData = results
      .filter((r) => r.success)
      .map((r) => {
        const originalRow = rows.find(
          (row) => row.username.toLowerCase() === r.username.toLowerCase(),
        );
        return {
          Username: r.username,
          Password: originalRow?.password ?? "",
        };
      });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    ws["!cols"] = [{ wch: 20 }, { wch: 20 }];
    XLSX.writeFile(
      wb,
      `new-accounts-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleCreate = async () => {
    const hasErrors = rows.some(
      (r) =>
        !r.username ||
        !r.first_name ||
        !r.last_name ||
        !r.password ||
        r.usernameError,
    );
    if (hasErrors) return;

    setIsCreating(true);
    setResults(null);

    const accounts: CreateAccountInput[] = rows.map((r) => ({
      username: r.username,
      first_name: r.first_name,
      last_name: r.last_name,
      password: r.password,
      role_id: r.role_id,
    }));

    try {
      const res = await massCreateAccounts(accounts, businessUnitId);
      setResults(res);
    } catch (err: unknown) {
      setResults(
        rows.map((r) => ({
          username: r.username,
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to create accounts",
        })),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setRows([createEmptyRow()]);
    setResults(null);
  };

  const isFormValid = rows.every(
    (r) =>
      r.username &&
      r.first_name &&
      r.last_name &&
      r.password &&
      !r.usernameError,
  );

  const activeCharsetCount =
    Object.values(passwordCharset).filter(Boolean).length;

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="space-y-6">
      {results ? (
        <Card>
          <CardHeader>
            <CardTitle>Creation Results</CardTitle>
            <CardDescription>
              {successCount} created successfully
              {failCount > 0 && `, ${failCount} failed`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {result.username}
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge
                              variant="default"
                              className="gap-1 bg-green-600"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Created
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.error || "Account created and added to BU"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {successCount > 0 && (
                <div className="bg-muted rounded-md p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Credentials for created accounts:
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportResults}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    {results
                      .filter((r) => r.success)
                      .map((r, idx) => {
                        const originalRow = rows.find(
                          (row) =>
                            row.username.toLowerCase() ===
                            r.username.toLowerCase(),
                        );
                        return (
                          <div key={idx}>
                            {r.username} / {originalRow?.password ?? "***"}
                          </div>
                        );
                      })}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Save these credentials. Passwords cannot be recovered later.
                  </p>
                </div>
              )}
              <Button onClick={resetForm} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Create More Accounts
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Accounts</CardTitle>
                <CardDescription>
                  Upload an Excel (.xlsx) or CSV file with columns: username,
                  first_name, last_name, password (optional). If password is
                  omitted, one will be generated. The first row can be a header.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="file-upload"
                    className="border-border hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-muted-foreground text-sm">
                    {rows.length > 1
                      ? `${rows.length} rows loaded`
                      : "No file loaded"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Employee List</CardTitle>
                <CardDescription>
                  Download a complete list of all employees in this business
                  unit, including their usernames and assigned roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExportEmployees}
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting
                    ? "Exporting..."
                    : "Download Employee List (.xlsx)"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Row
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAllPasswords}
                >
                  Generate Passwords
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings2 className="mr-1 h-4 w-4" />
                      Password Settings
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Length: {passwordLength}
                        </Label>
                        <Slider
                          value={[passwordLength]}
                          onValueChange={([val]) => setPasswordLength(val)}
                          min={6}
                          max={24}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Character Types
                        </Label>
                        <div className="space-y-2">
                          {(
                            [
                              ["lowercase", "Lowercase (a-z)"],
                              ["uppercase", "Uppercase (A-Z)"],
                              ["numbers", "Numbers (0-9)"],
                              ["symbols", "Symbols (!@#$%&*)"],
                            ] as const
                          ).map(([key, label]) => (
                            <div
                              key={key}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`pw-${key}`}
                                checked={passwordCharset[key]}
                                disabled={
                                  passwordCharset[key] &&
                                  activeCharsetCount <= 1
                                }
                                onCheckedChange={(checked) =>
                                  setPasswordCharset((prev) => ({
                                    ...prev,
                                    [key]: !!checked,
                                  }))
                                }
                              />
                              <Label
                                htmlFor={`pw-${key}`}
                                className="text-sm font-normal"
                              >
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Settings apply to newly generated passwords.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <span className="text-muted-foreground text-sm">
                {rows.length} account{rows.length !== 1 ? "s" : ""}
              </span>
            </div>
          </TabsContent>

          {/* Shared account table (shown for both tabs once data exists) */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Username</TableHead>
                      <TableHead className="w-[150px]">First Name</TableHead>
                      <TableHead className="w-[150px]">Last Name</TableHead>
                      <TableHead className="w-[160px]">Password</TableHead>
                      <TableHead className="w-[180px]">Role</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              value={row.username}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "username",
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/\s/g, ""),
                                )
                              }
                              onBlur={() => checkUsername(row.id, row.username)}
                              placeholder="username"
                              className={`font-mono text-sm ${row.usernameError ? "border-destructive" : ""}`}
                            />
                            {row.usernameChecking && (
                              <p className="text-muted-foreground text-xs">
                                Checking...
                              </p>
                            )}
                            {row.usernameError && (
                              <p className="text-destructive text-xs">
                                {row.usernameError}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.first_name}
                            onChange={(e) =>
                              updateRow(row.id, "first_name", e.target.value)
                            }
                            placeholder="First name"
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.last_name}
                            onChange={(e) =>
                              updateRow(row.id, "last_name", e.target.value)
                            }
                            placeholder="Last name"
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Input
                              value={row.password}
                              onChange={(e) =>
                                updateRow(row.id, "password", e.target.value)
                              }
                              placeholder="Password"
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateRow(
                                  row.id,
                                  "password",
                                  generatePassword(),
                                )
                              }
                              title="Generate password"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.role_id || "none"}
                            onValueChange={(val) =>
                              updateRow(
                                row.id,
                                "role_id",
                                val === "none" ? "" : val,
                              )
                            }
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="No role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No role</SelectItem>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  Accounts will be created with the usernames shown and added to
                  this business unit.
                </p>
                <Button
                  onClick={handleCreate}
                  disabled={!isFormValid || isCreating}
                  className="gap-2"
                >
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreating
                    ? `Creating ${rows.length} account${rows.length !== 1 ? "s" : ""}...`
                    : `Create ${rows.length} Account${rows.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  );
}
