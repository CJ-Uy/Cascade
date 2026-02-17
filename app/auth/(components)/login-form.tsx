"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const internalEmail = `${username.toLowerCase().trim()}@email.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });
      if (error) throw error;

      window.location.replace("/dashboard");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message === "Invalid login credentials"
            ? "Invalid username or password"
            : error.message
          : "An error occurred",
      );
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
          <Label htmlFor="username" className="text-foreground font-medium">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
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
          <p className="text-muted-foreground mt-1 text-xs">
            Forgot your password? Contact your administrator.
          </p>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-6 text-sm font-semibold"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
