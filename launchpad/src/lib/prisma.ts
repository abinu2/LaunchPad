/**
 * Prisma client singleton — server-side only.
 * Uses the Neon serverless HTTP driver for optimal cold-start performance on Vercel.
 * Import only in API routes (src/app/api/**).
 */
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // During build or test with no DB, return a no-adapter client.
    // Any actual DB call will throw a clear error at runtime.
    return new PrismaClient({
      log: ["error"],
      errorFormat: "pretty",
    });
  }

  const adapter = new PrismaNeonHttp(connectionString, { arrayMode: false, fullResults: false });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
    errorFormat: "pretty",
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
