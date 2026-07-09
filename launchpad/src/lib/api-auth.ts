import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

// Demo mode: skip Auth0 entirely and act as a fixed local user. On by default
// (including in production) — see proxy.ts for why. Must match DEV_USER.sub
// in src/context/AuthContext.tsx.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";
export const DEV_USER_SUB = "dev-user";

export async function requireSessionUser() {
  if (BYPASS_AUTH) {
    return { sub: DEV_USER_SUB, email: "dev@localhost", name: "Dev User" };
  }

  const session = await auth0.getSession();
  const user = session?.user;

  if (!user?.sub) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireBusinessAccess(businessId: string) {
  const user = await requireSessionUser();
  const business = await prisma.business.findFirst({
    where: { id: businessId, auth0Id: user.sub },
  });

  if (!business) {
    throw new Error("Forbidden");
  }

  return { user, business };
}
