import { auth0 } from "@/lib/auth0";

// Dev-only escape hatch: skip Auth0 session handling entirely.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export async function proxy(request: Request) {
  if (BYPASS_AUTH) return;
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
