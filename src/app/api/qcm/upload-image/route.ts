import { NextRequest, NextResponse } from "next/server";
import { access, chmod, constants, mkdir, writeFile } from "fs/promises";
import {
  getAdminActor,
  requireAdminRequest,
  safeJoinInside,
  sanitizeQuestionId,
  sanitizeSlug,
  sanitizeYear,
} from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const formData = await req.formData();
    const file = formData.get("file");
    const slug = String(formData.get("slug") || "");
    const annee = String(formData.get("annee") || "");
    const questionId = String(formData.get("questionId") || "");

    if (!(file instanceof File) || !slug || !annee || !questionId) {
      return NextResponse.json(
        { success: false, message: "Paramètres manquants" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { success: false, message: "Format d'image non autorisé" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Image trop lourde (4 Mo maximum)" },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(slug);
    const safeYear = sanitizeYear(annee);
    const safeQuestionId = sanitizeQuestionId(questionId);
    const imageRoot = safeJoinInside(process.cwd(), "public", "images", "qcm");
    const dir = safeJoinInside(imageRoot, safeSlug, safeYear);
    const filename = `q${safeQuestionId}.${ext}`;
    const filepath = safeJoinInside(dir, filename);

    await mkdir(dir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Garantit que le fichier reste lisible par le process qui sert les
    // fichiers statiques, même s'il tourne sous un autre utilisateur que
    // celui qui exécute Next.js (cas fréquent sur un VPS avec nginx devant).
    try {
      await chmod(filepath, 0o644);
    } catch (chmodError) {
      console.error("Erreur chmod image:", chmodError);
    }

    // Vérifie que le fichier écrit est bien lisible avant de confirmer le
    // succès au client, pour ne pas renvoyer success:true sur une écriture
    // silencieusement défaillante.
    try {
      await access(filepath, constants.R_OK);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "L'image a été envoyée mais n'a pas pu être vérifiée sur le serveur",
        },
        { status: 500 }
      );
    }

    logAdminAction(
      getAdminActor(req),
      "Upload d'une image de question",
      `${safeSlug} - ${safeYear} - q${safeQuestionId}`
    );

    return NextResponse.json({
      success: true,
      path: `/images/qcm/${safeSlug}/${safeYear}/${filename}?v=${Date.now()}`,
    });
  } catch (error) {
    console.error("Erreur upload image:", error);

    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
