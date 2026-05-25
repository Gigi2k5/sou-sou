import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Next.js qui protège l'espace `/admin/*`.
 *
 * On lit le cookie `access_token` (JWT signé par le backend), on **décode**
 * (sans vérifier la signature — ce serait trop coûteux et le secret n'a rien
 * à faire côté front) son payload pour récupérer le `role`. Si le user
 * n'est pas authentifié → redirect `/login`. Si le user est authentifié
 * mais pas admin → redirect `/dashboard`.
 *
 * La vérification réelle de la signature et du rôle est faite par le backend
 * via `JwtAuthGuard` + `AdminGuard`. Ce middleware est uniquement de l'UX :
 * éviter qu'un user normal arrive sur la coquille admin avec des appels qui
 * échouent ensuite. Un user qui forgerait un JWT `role:ADMIN` verrait la
 * coquille mais aucun endpoint ne répondrait.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRoleFromJwt(token);
  if (role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

function decodeRoleFromJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // base64url → base64 standard, puis decode.
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
