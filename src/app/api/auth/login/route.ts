import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/server/security";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = createAdminToken(username);

      return NextResponse.json({
        success: true,
        token,
        message: "Connexion réussie",
      });
    }

    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
