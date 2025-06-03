import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {    
        enabled: true
    },
    session: {
        expiresIn: 30 * 24 * 60 * 60, // 30 Days. This refers to how long a user stays logged in (in seconds). Can be configured.
    },
    advanced: {
        database: {
            generateId: false,
        }
    }
});
