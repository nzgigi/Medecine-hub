import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/server/mailer";
import {
  FORBIDDEN_EMAIL_MESSAGE,
  clientKey,
  isAllowedEmail,
  isRateLimited,
  issueLoginCode,
  normalizeEmail,
} from "@/lib/server/universityAuth";

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`code:${clientKey(request)}`, 8, 1000 * 60 * 10)) {
      return NextResponse.json(
        { success: false, message: "Trop de tentatives, réessayez plus tard." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: unknown };
    let email: string;

    try {
      email = normalizeEmail(body.email);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "E-mail invalide",
        },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, message: FORBIDDEN_EMAIL_MESSAGE },
        { status: 403 }
      );
    }

    const issued = issueLoginCode(email);

    if (!issued.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Un code vient d'être envoyé. Patientez ${issued.retryAfterSeconds} s avant d'en demander un autre.`,
          retryAfterSeconds: issued.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    try {
      await sendMail({
        to: email,
        subject: `Votre code de connexion Medecine Hub : ${issued.code}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
          <h2 style="margin-bottom: 8px;">Connexion à Medecine Hub</h2>
          <p>Saisissez ce code pour vous connecter. Il est valable 10 minutes.</p>
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; background: #f5f5f4; padding: 16px; text-align: center; border-radius: 8px;">${issued.code}</p>
          <p style="color: #78716c; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>
        </div>
      `,
      });
    } catch (mailError) {
      console.error("Envoi du code de connexion impossible:", mailError);
      return NextResponse.json(
        { success: false, message: "Impossible d'envoyer l'e-mail pour le moment." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("request-code error:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
