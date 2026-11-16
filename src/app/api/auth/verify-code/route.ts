import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, upsertUser } from "@/lib/server/userStore";
import { recordActivityEvent } from "@/lib/server/social";
import {
  FORBIDDEN_EMAIL_MESSAGE,
  SESSION_COOKIE_NAME,
  clientKey,
  consumeLoginCode,
  createSessionToken,
  isAllowedEmail,
  isRateLimited,
  nameFromEmail,
  normalizeEmail,
  sessionCookieOptions,
  subForEmail,
} from "@/lib/server/universityAuth";

const ERRORS = {
  invalid: "Code incorrect.",
  expired: "Ce code a expiré, demandez-en un nouveau.",
  locked: "Trop d'essais, demandez un nouveau code.",
} as const;

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`verify:${clientKey(request)}`, 20, 1000 * 60 * 10)) {
      return NextResponse.json(
        { success: false, message: "Trop de tentatives, réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: unknown; code?: unknown };
    const email = normalizeEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, message: FORBIDDEN_EMAIL_MESSAGE },
        { status: 403 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: "Le code contient 6 chiffres." },
        { status: 400 }
      );
    }

    const result = consumeLoginCode(email, code);

    if (result !== "ok") {
      return NextResponse.json(
        { success: false, message: ERRORS[result] },
        { status: 401 }
      );
    }

    // Réutilise le compte existant (ex. créé via Google avec la même adresse).
    const existing = getUserByEmail(email);
    const user = upsertUser({
      sub: existing?.sub ?? subForEmail(email),
      name: existing?.name ?? nameFromEmail(email),
      email,
      picture: existing?.picture,
    });

    if (!existing) {
      recordActivityEvent(user.sub, "joined");
    }

    const response = NextResponse.json({ success: true, user });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken(user.sub, email),
      sessionCookieOptions()
    );

    return response;
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
