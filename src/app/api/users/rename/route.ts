import { NextRequest, NextResponse } from "next/server";
import {
  readUsers,
  sanitizeDisplayName,
  sanitizeSub,
  setUserDisplayName,
} from "@/lib/server/userStore";

export async function POST(req: NextRequest) {
  try {
    const { sub: rawSub, name: rawName } = (await req.json()) as {
      sub?: string;
      name?: string;
    };

    const sub = sanitizeSub(rawSub);
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
