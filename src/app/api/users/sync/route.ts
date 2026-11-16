import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleCredential } from "@/lib/server/googleAuth";
import { getUserBySub, upsertUser } from "@/lib/server/userStore";
import { recordActivityEvent } from "@/lib/server/social";
import {
  FORBIDDEN_EMAIL_MESSAGE,
  isAllowedEmail,
} from "@/lib/server/universityAuth";

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Erreur de synchronisation",
      },
      { status: 400 }
    );
  }
}
