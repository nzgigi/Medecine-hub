import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
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

    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Envoi d'e-mails non configuré");
      }

      console.log(`[auth] Code de connexion pour ${email} : ${issued.code}`);
      return NextResponse.json({ success: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from:
        process.env.AUTH_EMAIL_FROM || "Medecine Hub <onboarding@resend.dev>",
      to: [email],
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

    if (error) {
      console.error("Resend error (login code):", error);
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
