import { NextRequest, NextResponse } from "next/server";
import {
  readUsers,
  sanitizeDisplayName,
  setUserDisplayName,
} from "@/lib/server/userStore";
import { getSessionSub } from "@/lib/server/universityAuth";

export async function POST(req: NextRequest) {
  try {
    const sub = getSessionSub(req);
    if (!sub) {
      return NextResponse.json({ success: false, message: "Connexion requise" }, { status: 401 });
    }

    const { name: rawName } = (await req.json()) as { name?: string };
    const name = sanitizeDisplayName(rawName);

    if (!readUsers()[sub]) {
      return NextResponse.json(
        { success: false, message: "Utilisateur inconnu — reconnectez-vous" },
        { status: 404 }
      );
    }

    const user = setUserDisplayName(sub, name);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 400 }
    );
  }
}
