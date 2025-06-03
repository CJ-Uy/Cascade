import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    const data = await request.json();

    // Get user's role id to reference the approval system's flow
    

    return NextResponse.json(data);
}
