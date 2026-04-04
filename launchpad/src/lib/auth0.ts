/**
 * Auth0 v4 client — server-side only.
 * Import only in API routes and server components.
 */
import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Validate required Auth0 environment variables
const requiredEnvVars = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_BASE_URL",
  "AUTH0_SECRET",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.warn(
    `Missing Auth0 environment variables: ${missingVars.join(", ")}. Auth0 will not work properly.`
  );
}

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || "placeholder.auth0.com",
  clientId: process.env.AUTH0_CLIENT_ID || "placeholder",
  clientSecret: process.env.AUTH0_CLIENT_SECRET || "placeholder",
  appBaseUrl: process.env.AUTH0_BASE_URL || "http://localhost:3000",
  secret: process.env.AUTH0_SECRET || "placeholder-secret-key-for-build",
});
