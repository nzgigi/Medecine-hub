// src/app/api/devis/route.ts
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, company, message } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'Easy Study <onboarding@resend.dev>',
      to: ['nnzn4s1m@gmail.com'],
      replyTo: email,
      subject: `[DEVIS] ${company || name}`,
      html: `
        <h2>💼 Nouvelle demande de devis</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Téléphone:</strong> ${phone || 'Non renseigné'}</p>
        <p><strong>Entreprise:</strong> ${company || 'Non renseignée'}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
