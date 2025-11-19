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
        <h1 className="text-foreground text-4xl font-bold tracking-tight">
          Enhance productivity
          <br /> with <span className="text-primary">Cascade</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Brought to you by AKIVA Holdings
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-foreground font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-border bg-primary/5 focus:border-primary focus:ring-primary rounded-lg px-4 py-5 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-foreground font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border bg-primary/5 focus:border-primary focus:ring-primary rounded-lg px-4 py-5 text-sm"
          />
          <Link
            href="/auth/forgot-password"
            className="text-muted-foreground hover:text-foreground mt-1 text-xs"
          >
            Forgot Username/Password?
          </Link>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-6 text-sm font-semibold"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        <div className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Register
          </Link>
        </div>
      </form>
    </div>
  );
}
