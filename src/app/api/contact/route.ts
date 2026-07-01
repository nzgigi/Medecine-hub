import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/server/security";

const resend = new Resend(process.env.RESEND_API_KEY);
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 10;
const RATE_LIMIT_MAX = 3;
const contactAttempts = new Map<string, number[]>();

function getClientKey(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recentAttempts = (contactAttempts.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentAttempts.length >= RATE_LIMIT_MAX) {
    contactAttempts.set(key, recentAttempts);
    return true;
  }

  contactAttempts.set(key, [...recentAttempts, now]);
  return false;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(getClientKey(req))) {
      return NextResponse.json(
        { error: "Trop de messages envoyés, réessayez plus tard" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = cleanText(body.name, 120);
    const email = cleanText(body.email, 180);
    const subject = cleanText(body.subject, 180);
    const message = cleanText(body.message, 3000);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    const escapedMessage = escapeHtml(message).replace(/\n/g, "<br />");

    const { data, error } = await resend.emails.send({
      from: "Medecine Hub <onboarding@resend.dev>",
      to: ["nnzn4s1m@gmail.com"],
      replyTo: email,
      subject: `[Contact Medecine Hub] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouveau message de contact</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>De:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 5px 0;"><strong>Sujet:</strong> ${escapeHtml(subject)}</p>
          </div>
          <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Message:</h3>
            <p style="color: #4b5563; line-height: 1.6;">${escapedMessage}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email envoyé avec succès",
      data,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
