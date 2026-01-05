"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  User,
  Shield,
  Building2,
  Key,
  Camera,
  Mail,
  Calendar,
  CheckCircle2,
  Crown,
  Users,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  uploadAvatar,
  type UserProfileData,
} from "./actions";

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Avatar state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const result = await getUserProfile();

      if (result.success && result.data) {
        setProfile(result.data);
        setFirstName(result.data.first_name || "");
        setMiddleName(result.data.middle_name || "");
        setLastName(result.data.last_name || "");
      } else {
        toast.error(result.error || "Failed to load profile");
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    const result = await updateUserProfile({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
    });

    if (result.success) {
      toast.success("Profile updated successfully");
      // Refresh profile data
      const refreshed = await getUserProfile();
      if (refreshed.success && refreshed.data) {
        setProfile(refreshed.data);
      }
    } else {
      toast.error(result.error || "Failed to update profile");
    }

    setIsUpdatingProfile(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsUpdatingPassword(true);

    const result = await updateUserPassword({
      newPassword,
      confirmPassword,
    });

    if (result.success) {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(result.error || "Failed to update password");
    }

    setIsUpdatingPassword(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatar(formData);

    if (result.success && result.url) {
      toast.success("Avatar updated successfully");
      // Refresh profile data
      const refreshed = await getUserProfile();
      if (refreshed.success && refreshed.data) {
        setProfile(refreshed.data);
      }
    } else {
      toast.error(result.error || "Failed to upload avatar");
    }

    setIsUploadingAvatar(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "U";
  };

  const getPermissionBadgeVariant = (level: string) => {
    switch (level) {
      case "BU_ADMIN":
        return "default";
      case "APPROVER":
        return "secondary";
      case "AUDITOR":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatPermissionLevel = (level: string) => {
    switch (level) {
      case "BU_ADMIN":
        return "Admin";
      case "APPROVER":
        return "Approver";
      case "AUDITOR":
        return "Auditor";
      case "MEMBER":
        return "Member";
      default:
        return level;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <DashboardHeader title="Settings" />
        <div className="mx-auto mt-6 max-w-4xl space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Settings" />
      <p className="text-muted-foreground mb-8">
        Manage your account settings and preferences.
      </p>

      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Roles & Access
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Key className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Avatar Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={profile?.image_url || undefined}
                      alt="Profile"
                    />
                    <AvatarFallback className="text-2xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? "Uploading..." : "Change Picture"}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      JPG, PNG, GIF or WebP. Max 5MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
                      <span>{profile?.email}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Name fields */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="Enter middle name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  {/* Account created date */}
                  {profile?.created_at && (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Member since{" "}
                      {format(new Date(profile.created_at), "MMMM d, yyyy")}
                    </div>
                  )}

                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Access Tab */}
          <TabsContent value="roles" className="space-y-6">
            {/* System Roles */}
            {profile?.system_roles && profile.system_roles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    System Roles
                  </CardTitle>
                  <CardDescription>
                    System-wide roles that grant you special privileges across
                    the entire platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.system_roles.map((role) => (
                      <Badge
                        key={role.id}
                        variant="default"
                        className="bg-yellow-600 px-3 py-1 text-sm hover:bg-yellow-700"
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organization Roles */}
            {profile?.organization_roles &&
              profile.organization_roles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      Organization Roles
                    </CardTitle>
                    <CardDescription>
                      Roles within your organization that determine your access
                      level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.organization_roles.map((role) => (
                        <div
                          key={role.id}
                          className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-500/10 p-2">
                              <Building2 className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium">{role.name}</p>
                              <p className="text-muted-foreground text-sm">
                                {role.organization_name}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/10 text-blue-600"
                          >
                            Organization
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Business Unit Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  Business Unit Roles
                </CardTitle>
                <CardDescription>
                  Your roles and permissions within each business unit you
                  belong to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.bu_roles && profile.bu_roles.length > 0 ? (
                  <div className="space-y-3">
                    {profile.bu_roles.map((bu) => (
                      <div
                        key={bu.business_unit_id}
                        className="bg-muted/50 flex items-center justify-between rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-green-500/10 p-2">
                            <Users className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {bu.business_unit_name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Role: {bu.role_name}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={getPermissionBadgeVariant(
                            bu.permission_level,
                          )}
                        >
                          {formatPermissionLevel(bu.permission_level)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p>You are not assigned to any business units yet.</p>
                    <p className="text-sm">
                      Contact your administrator to get access.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Access Summary */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-center text-sm">
                  <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>
                    Your access permissions are managed by your organization
                    administrator.
                  </p>
                  <p>
                    Contact them if you need additional access or have
                    questions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={8}
                    />
                    <p className="text-muted-foreground text-xs">
                      Password must be at least 8 characters long.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      isUpdatingPassword || !newPassword || !confirmPassword
                    }
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Security Tips */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-medium">
                    <Shield className="h-4 w-4" />
                    Security Tips
                  </h4>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                      Use a unique password that you don&apos;t use on other
                      sites
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                      Include a mix of letters, numbers, and special characters
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                      Never share your password with anyone
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                      Log out when using shared or public computers
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
