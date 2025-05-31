import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ test: "HELLO" });
}

export async function POST(request) {
  const data = await request.json();

  return NextResponse.json(data);
}
