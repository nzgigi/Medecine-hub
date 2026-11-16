import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/universityAuth";

/**
 * Portail d'accès : le site n'est utilisable qu'avec une session ouverte par
 * une adresse @utoulouse.fr / @univ-tlse3.fr. Tout le reste renvoie vers
 * /connexion (pages) ou 401 (API).
 */

const PUBLIC_PREFIXES = [
  "/connexion",
  "/api/auth/", // ouverture/fermeture de session
  "/admin", // pages admin : protégées par leur propre connexion
  "/api/admin/",
  "/api/presence/", // appelés par le bot Discord et le suivi de présence
  "/api/track/",
  "/api/discord/stats", // appelé par le bot Discord
  "/brand/",
  "/mentions-legales",
  "/contact",
  "/api/contact",
  "/resultat", // pages de partage de score (aperçus Discord, etc.)
  "/api/og/",
];

const PUBLIC_FILES = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublic(pathname: string) {
  return (
    PUBLIC_FILES.includes(pathname) ||
    PUBLIC_PREFIXES.some(
      (prefix) =>
        pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
    )
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Connexion requise" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/connexion", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
