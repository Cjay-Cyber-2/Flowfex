import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../db/schema.js";

// Initialize Drizzle ORM with Neon Serverless WebSocket Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost/dummy",
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });

// Initialize Better Auth
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:4000",
  trustedOrigins: ["https://flowfex.vercel.app", "http://localhost:3000"],
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    jwt({
      jwt: {
        secret: process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET,
      },
    }),
  ],
  advanced: {
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
});
