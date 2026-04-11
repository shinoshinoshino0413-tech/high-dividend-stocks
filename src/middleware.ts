export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all routes except auth, api/auth, api/cron, and static files
    "/((?!api/auth|api/cron|auth|_next/static|_next/image|favicon.ico).*)"
  ]
};
