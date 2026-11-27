import { NextResponse } from "next/server";
import fs from "fs";
import { getAdminActor, requireAdminRequest } from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";
import { listPrivateQcm, privateQcmPath, renamePrivateSubject } from "@/lib/server/privateQcm";
import { renameInPrivateHistory } from "@/lib/server/privateHistory";
import { cleanPrivateName } from "@/lib/exam/privateNaming";
import { validateAnnales } from "@/lib/annalesImport";

export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

// Liste, ou lecture d'un QCM prive complet avec ?slug=...&annee=...
export async function GET(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const params = new URL(request.url).searchParams;
    const slug = params.get("slug");
    const annee = params.get("annee");

    if (slug && annee) {
      const filePath = privateQcmPath(slug, annee);
      if (!fs.existsSync(filePath)) return fail("QCM introuvable", 404);
      return new NextResponse(fs.readFileSync(filePath, "utf-8"), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ success: true, qcms: listPrivateQcm() });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { annales?: unknown; overwrite?: boolean };
    if (!Array.isArray(body.annales)) return fail("Liste d'annales manquante.");

    const existing = listPrivateQcm();
    const subjects = [...new Map(existing.map((q) => [q.slug, q])).values()].map((q) => ({
      slug: q.slug,
      matiere: q.matiere,
    }));
    const { valid, errors } = validateAnnales(body.annales, subjects, existing);
    if (errors.length > 0) return fail(errors.map((e) => e.message).join(" "));

    let imported = 0;
    let skipped = 0;
    for (const item of valid) {
      const filePath = privateQcmPath(item.slug, item.annee);
      if (fs.existsSync(filePath) && body.overwrite !== true) {
        skipped += 1;
        continue;
      }
      fs.writeFileSync(filePath, JSON.stringify(item.exam, null, 2), "utf-8");
      imported += 1;
    }

    if (imported > 0) {
      logAdminAction(getAdminActor(request), "Import QCM prive (JSON)", `${imported} QCM`);
    }
    return NextResponse.json({ success: true, imported, skipped });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}

export async function PATCH(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { slug?: unknown; matiere?: unknown };
    const matiere = cleanPrivateName(body.matiere);
    if (typeof body.slug !== "string" || !body.slug) return fail("slug requis");
    if (!matiere) return fail("Le nom doit contenir entre 1 et 200 caracteres.");

    if (renamePrivateSubject(body.slug, matiere) === 0) return fail("QCM introuvable", 404);
    renameInPrivateHistory(body.slug, matiere);
    logAdminAction(getAdminActor(request), "Renommage QCM prive", `${body.slug} : ${matiere}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const { slug, annee } = (await request.json()) as { slug?: string; annee?: number };
    if (!slug || !annee) return fail("slug et annee requis");

    const filePath = privateQcmPath(slug, annee);
    if (!fs.existsSync(filePath)) return fail("QCM introuvable", 404);
    fs.unlinkSync(filePath);
    logAdminAction(getAdminActor(request), "Suppression QCM prive", `${slug} ${annee}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}
