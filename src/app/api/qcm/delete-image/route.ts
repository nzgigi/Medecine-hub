import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import {
  getAdminActor,
  requireAdminRequest,
  safeJoinInside,
} from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const { imagePath: rawImagePath } = (await req.json()) as {
      imagePath?: string;
    };

    // Le chemin peut porter un paramètre de cache-busting (?v=...) ajouté à
    // l'upload : on le retire avant de résoudre le chemin disque.
    const imagePath = rawImagePath?.split("?")[0];

    if (!imagePath || !imagePath.startsWith("/images/qcm/")) {
      return NextResponse.json(
        { success: false, message: "Chemin d'image invalide" },
        { status: 400 }
      );
    }

    const imageRoot = safeJoinInside(process.cwd(), "public", "images", "qcm");
    const relativeImagePath = imagePath.replace(/^\/images\/qcm\//, "");
    const fullPath = safeJoinInside(imageRoot, relativeImagePath);

    await unlink(fullPath);

    logAdminAction(getAdminActor(req), "Suppression d'une image de question", imagePath);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Fichier introuvable" },
      { status: 404 }
    );
  }
}
