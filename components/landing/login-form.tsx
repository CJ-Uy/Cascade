"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Update this route to redirect to an authenticated route. The user already has an active session.
      window.location.replace("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-10", className)} {...props}>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Enhance productivity
          <br /> with <span className="text-emerald-500">Cascade</span>
        </h1>
        <p className="text-sm text-gray-500">
          Brought to you by AKIVA Holdings
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border-gray-200 bg-green-50/50 px-4 py-5 text-sm focus:border-green-400 focus:ring-green-400"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="font-medium text-gray-700">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border-gray-200 bg-green-50/50 px-4 py-5 text-sm focus:border-green-400 focus:ring-green-400"
          />
          <Link
            href="/auth/forgot-password"
            className="mt-1 text-xs text-gray-500 hover:text-gray-800"
          >
            Forgot Username/Password?
          </Link>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          type="submit"
          className="w-full rounded-lg bg-emerald-400 py-6 text-sm font-semibold text-gray-900 hover:bg-emerald-300"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        <div className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/sign-up"
            className="font-medium text-emerald-500 hover:underline"
          >
            Register
          </Link>
        </div>
      </form>
    </div>
  );
}
