import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleCredential } from "@/lib/server/googleAuth";
import { getUserBySub, upsertUser } from "@/lib/server/userStore";
import { recordActivityEvent } from "@/lib/server/social";
import {
  FORBIDDEN_EMAIL_MESSAGE,
  SESSION_COOKIE_NAME,
  clientKey,
  createSessionToken,
  isAllowedEmail,
  isRateLimited,
  sessionCookieOptions,
} from "@/lib/server/universityAuth";

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`google:${clientKey(request)}`, 30, 1000 * 60 * 10)) {
      return NextResponse.json(
        { success: false, message: "Trop de tentatives, réessayez plus tard." },
        { status: 429 }
      );
    }

    const { credential } = (await request.json()) as { credential?: string };
    const profile = await verifyGoogleCredential(credential);

    if (!isAllowedEmail(profile.email)) {
      return NextResponse.json(
        { success: false, message: FORBIDDEN_EMAIL_MESSAGE },
        { status: 403 }
      );
    }

    const isNewUser = !getUserBySub(profile.sub);
    const user = upsertUser(profile);

    if (isNewUser) {
      recordActivityEvent(user.sub, "joined");
    }

    const response = NextResponse.json({ success: true, user });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken(user.sub, user.email),
      sessionCookieOptions()
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Connexion impossible",
      },
      { status: 400 }
    );
  }
}
