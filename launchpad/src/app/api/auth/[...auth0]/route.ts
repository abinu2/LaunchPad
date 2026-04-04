import { auth0 } from "@/lib/auth0";
import { NextRequest } from "next/server";

async function handler(req: NextRequest) {
  return auth0.middleware(req);
}

export { handler as GET, handler as POST };
