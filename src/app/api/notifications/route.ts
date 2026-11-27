import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationsRead } from "@/lib/server/notifications";
import { getSessionSub } from "@/lib/server/universityAuth";

export const dynamic = "force-dynamic";

// L'identité vient uniquement du cookie de session, jamais d'un paramètre envoyé par le navigateur.
const unauthorized = () =>
  NextResponse.json({ success: false, message: "Connexion requise" }, { status: 401 });

export function GET(request: NextRequest) {
  const sub = getSessionSub(request);
  if (!sub) return unauthorized();

  return NextResponse.json({ success: true, notifications: getNotifications(sub) });
}

export async function POST(request: NextRequest) {
  const sub = getSessionSub(request);
  if (!sub) return unauthorized();

  try {
    const body = (await request.json()) as { keys?: unknown };
    markNotificationsRead(sub, Array.isArray(body.keys) ? body.keys.slice(0, 100) : []);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Requête invalide" }, { status: 400 });
  }
}
