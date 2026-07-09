import { auth0 } from "@/lib/auth0";

// Demo mode: skip Auth0 session handling entirely. On by default (including
// in production) since the Auth0 callback URL isn't registered for this
// deployment yet. Set NEXT_PUBLIC_BYPASS_AUTH=false once real login works.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

export async function proxy(request: Request) {
  if (BYPASS_AUTH) return;
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
