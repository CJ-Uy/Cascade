"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserPlus } from "lucide-react";
import { createInvitationAction } from "../invitations-actions";
import { createClient } from "@/lib/supabase/client";

interface InviteUserActionProps {
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function InviteUserAction({ user }: InviteUserActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  async function fetchOrganizations() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setOrganizations(data);
    }
  }

  async function handleInvite() {
    if (!selectedOrgId) {
      setError("Please select an organization");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createInvitationAction({
      userId: user.id,
      organizationId: selectedOrgId,
      sendEmail,
      message: message.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setSelectedOrgId("");
      setMessage("");
      setSendEmail(false);
      setLoading(false);
    }
  }

  const userName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.email ||
    "User";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User to Organization</DialogTitle>
          <DialogDescription>
            Send an invitation to {userName} to join an organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger id="organization">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
            <Label htmlFor="send-email">Send email notification</Label>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || !selectedOrgId}>
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
