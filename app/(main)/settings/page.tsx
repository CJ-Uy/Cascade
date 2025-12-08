"use client";

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
import { useState, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function Settings() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate an async operation
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Profile update (UI only) successful!");
      if (profilePicture) {
        setAvatarUrl(URL.createObjectURL(profilePicture));
      }
    }, 1500);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPassword(true);

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      setIsLoadingPassword(false);
      return;
    }

    // Simulate an async operation
    setTimeout(() => {
      setIsLoadingPassword(false);
      toast.success("Password update (UI only) successful!");
      setNewPassword("");
      setConfirmPassword("");
    }, 1500);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePicture(e.target.files[0]);
      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Toaster />
      <DashboardHeader title="Settings" />

      <div className="flex w-full max-w-3xl flex-col space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleProfileUpdate}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-4">
                <Avatar
                  className="h-24 w-24 cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <AvatarImage
                    src={avatarUrl || "/placeholder-avatar.jpg"}
                    alt="Avatar"
                  />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAvatarClick}
                >
                  Upload New Picture
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handlePasswordUpdate}
              className="flex flex-col gap-6"
            >
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isLoadingPassword}>
                {isLoadingPassword ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
