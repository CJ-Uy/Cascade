"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  debugReimbursementWorkflow,
  manuallyTriggerNextSection,
  checkRequestApprovalStatus,
  getNotificationsForUser,
  checkSectionInitiators,
  debugSectionInitiatorUsers,
} from "@/app/(main)/management/approval-system/debug-actions";

export default function DebugPage() {
  const [requestId, setRequestId] = useState("");
  const [workflowChainId, setWorkflowChainId] = useState(
    "7906861a-20c4-4ce9-9da3-06047a2850c3",
  );
  const [userEmail, setUserEmail] = useState("approvera3@email.com");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckWorkflow = async () => {
    setLoading(true);
    try {
      const data = await debugReimbursementWorkflow();
      setResults({ type: "workflow", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await checkRequestApprovalStatus(requestId);
      setResults({ type: "request", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerNext = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await manuallyTriggerNextSection(requestId);
      setResults({ type: "trigger", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNotifications = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const data = await getNotificationsForUser(userEmail);
      setResults({ type: "notifications", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInitiators = async () => {
    if (!workflowChainId) return;
    setLoading(true);
    try {
      const data = await checkSectionInitiators(workflowChainId);
      setResults({ type: "initiators", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  const handleDebugInitiatorUsers = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      // Check Section 1 (next section after Section 0)
      const data = await debugSectionInitiatorUsers(requestId, 1);
      setResults({ type: "initiator-users", data });
    } catch (error) {
      setResults({ type: "error", error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Request Debug Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Check Reimbursement Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCheckWorkflow} disabled={loading}>
            Check Workflow Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check Specific Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="requestId">Request ID</Label>
            <Input
              id="requestId"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="Enter request ID"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCheckRequest}
              disabled={loading || !requestId}
            >
              Check Status
            </Button>
            <Button
              onClick={handleTriggerNext}
              disabled={loading || !requestId}
              variant="secondary"
            >
              Manually Trigger Next Section
            </Button>
            <Button
              onClick={handleDebugInitiatorUsers}
              disabled={loading || !requestId}
              variant="outline"
            >
              Debug Section 1 Initiators
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check User Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email"
            />
          </div>
          <Button
            onClick={handleCheckNotifications}
            disabled={loading || !userEmail}
          >
            Check Notifications
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check Section Initiators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workflowChainId">Workflow Chain ID</Label>
            <Input
              id="workflowChainId"
              value={workflowChainId}
              onChange={(e) => setWorkflowChainId(e.target.value)}
              placeholder="Enter workflow chain ID"
            />
          </div>
          <Button
            onClick={handleCheckInitiators}
            disabled={loading || !workflowChainId}
          >
            Check Initiators for All Sections
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto rounded bg-gray-100 p-4 dark:bg-gray-800">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
