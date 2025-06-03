import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    const { id: userId } = await request.json();
    
    // Get 

	return NextResponse.json(data);
}
