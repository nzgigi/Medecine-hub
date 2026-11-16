import nodemailer from "nodemailer";
import { Resend } from "resend";

interface Mail {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoie un e-mail transactionnel. Priorité au SMTP (boîte OVH du domaine) si
 * SMTP_PASS est défini, sinon repli sur Resend. Lève une erreur en cas d'échec.
 */
export async function sendMail({ to, subject, html }: Mail) {
  if (process.env.SMTP_PASS) {
    const user = process.env.SMTP_USER || "contact@medecinehub.fr";
    const port = Number(process.env.SMTP_PORT || 465);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "ssl0.ovh.net",
      port,
      secure: port === 465,
      auth: { user, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.AUTH_EMAIL_FROM || `Medecine Hub <${user}>`,
      to,
      subject,
      html,
    });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Envoi d'e-mails non configuré");
    }
    console.log(`[mail] à ${to} — ${subject}`);
    return;
  }

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.AUTH_EMAIL_FROM || "Medecine Hub <onboarding@resend.dev>",
    to: [to],
    subject,
    html,
  });

  if (error) throw new Error(`Resend: ${error.message}`);
}
