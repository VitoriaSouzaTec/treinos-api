import { prisma } from "./db.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";





export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",

    }),
    trustedOrigins:["http://localhost:3000"],
    // conexao com frontend
    emailAndPassword: {
        enabled: true,
    },


    plugins: [openAPI()],
})