import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 *
 * Used by Docker health checks and monitoring systems
 * to verify the application is running correctly.
 *
 * Returns:
 * - 200 OK with status information
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
    { status: 200 },
  );
}
