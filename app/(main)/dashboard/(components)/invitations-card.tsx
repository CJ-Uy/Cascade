"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail } from "lucide-react";
import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/(main)/admin/users/invitations-actions";
import { useRouter } from "next/navigation";

interface Invitation {
  id: string;
  created_at: string;
  message: string | null;
  organizations: {
    name: string;
    logo_url: string | null;
  } | null;
  invited_by_profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface InvitationsCardProps {
  invitations: Invitation[];
}

export function InvitationsCard({ invitations }: InvitationsCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(invitationId: string) {
    setLoading(invitationId);
    setError(null);

    const result = await acceptInvitationAction(invitationId);

    if (result.error) {
      setError(result.error);
      setLoading(null);
    } else {
      router.refresh();
    }
  }

  async function handleDecline(invitationId: string) {
    setLoading(invitationId);
    setError(null);

    const result = await declineInvitationAction(invitationId);

    if (result.error) {
      setError(result.error);
      setLoading(null);
    } else {
      router.refresh();
    }
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Organization Invitations</CardTitle>
          <Badge variant="default">{invitations.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {invitations.map((invitation) => {
          const inviterName = invitation.invited_by_profile
            ? `${invitation.invited_by_profile.first_name || ""} ${invitation.invited_by_profile.last_name || ""}`.trim()
            : "Administrator";
          const orgName =
            invitation.organizations?.name || "Unknown Organization";

          return (
            <div
              key={invitation.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {invitation.organizations?.logo_url && (
                    <img
                      src={invitation.organizations.logo_url}
                      alt={orgName}
                      className="h-8 w-8 rounded object-contain"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{orgName}</p>
                    <p className="text-muted-foreground text-sm">
                      Invited by {inviterName}
                    </p>
                  </div>
                </div>
                {invitation.message && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {invitation.message}
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={loading === invitation.id}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(invitation.id)}
                  disabled={loading === invitation.id}
                >
                  <X className="mr-1 h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
