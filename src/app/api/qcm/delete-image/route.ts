import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import {
  requireAdminRequest,
  safeJoinInside,
} from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const { imagePath } = (await req.json()) as { imagePath?: string };

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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Fichier introuvable" },
      { status: 404 }
    );
  }
}
