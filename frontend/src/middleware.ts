import { NextResponse } from "next/server";

/**
 * Middleware Next.js — no-op en prod.
 *
 * Historiquement on protégeait /admin/* en lisant le cookie `access_token` ici
 * pour redirect vers /login si absent ou non-admin. Mais en prod cross-domain
 * (Vercel ↔ Render), le cookie est posé sur le domaine du backend (Render) avec
 * SameSite=None — il n'est jamais visible côté Vercel, donc ce middleware
 * redirigeait systématiquement les admins authentifiés vers /login → boucle.
 *
 * La protection est désormais assurée à 2 niveaux :
 *   - AdminLayout (côté client) : redirige si user.role !== 'ADMIN'
 *   - AdminGuard (backend)      : rejette toute requête admin non autorisée
 *
 * On garde le fichier pour pouvoir réintroduire facilement une logique
 * server-side si on adopte un domaine custom partagé (cookies non cross-site).
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
