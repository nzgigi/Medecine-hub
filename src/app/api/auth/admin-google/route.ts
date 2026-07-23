import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleCredential } from "@/lib/server/googleAuth";
import { logAdminAction } from "@/lib/server/adminLog";
import {
  ADMIN_GOOGLE_WHITELIST,
  createAdminToken,
} from "@/lib/server/security";

export async function POST(request: NextRequest) {
  try {
    const { credential } = (await request.json()) as { credential?: string };

    const profile = await verifyGoogleCredential(credential);

    if (!ADMIN_GOOGLE_WHITELIST.includes(profile.email.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          message: "Ce compte Google n'est pas autorisé pour l'administration",
        },
        { status: 403 }
      );
    }

    const identity = {
      googleEmail: profile.email,
      googleName: profile.name,
      googlePicture: profile.picture,
    };

    const token = createAdminToken(profile.email, identity);

    logAdminAction(
      { username: profile.email, ...identity },
      "Connexion admin (Google)"
    );

    return NextResponse.json({
      success: true,
      token,
      name: profile.name,
      picture: profile.picture,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Erreur de connexion",
      },
      { status: 401 }
    );
  }
}
