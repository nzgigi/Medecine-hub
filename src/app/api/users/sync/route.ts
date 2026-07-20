import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleCredential } from "@/lib/server/googleAuth";
import { upsertUser } from "@/lib/server/userStore";

export async function POST(request: NextRequest) {
  try {
    const { credential } = (await request.json()) as { credential?: string };

    const profile = await verifyGoogleCredential(credential);
    const user = upsertUser(profile);

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
