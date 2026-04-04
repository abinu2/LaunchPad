/**
 * Prisma client singleton — server-side only.
 * Import only in API routes (src/app/api/**).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL;

// Only create adapter if we have a connection string (skip during build if not set)
let adapter: PrismaPg | undefined;
try {
  if (connectionString) {
    adapter = new PrismaPg({ connectionString });
  }
} catch (e) {
  // Adapter initialization failed, will use default
  console.warn("Failed to initialize PrismaPg adapter:", e instanceof Error ? e.message : String(e));
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
    errorFormat: "pretty",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
