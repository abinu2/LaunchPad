import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

export async function requireSessionUser() {
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
