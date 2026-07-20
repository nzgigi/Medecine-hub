import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";

/**
 * Filet de secours pour /images/qcm/**.
 * Voir src/app/data/qcm/[...path]/route.ts pour l'explication complète :
 * une image uploadée après le démarrage du serveur en production peut être
 * invisible pour le serveur statique tant que le process n'est pas
 * redémarré. Cette route relit le disque à chaque requête.
 */
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;
    const imageRoot = safeJoinInside(process.cwd(), "public", "images", "qcm");
    const filePath = safeJoinInside(imageRoot, ...segments);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new NextResponse("Image introuvable", { status: 404 });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext];

    if (!contentType) {
      return new NextResponse("Format non autorisé", { status: 400 });
    }

    const bytes = fs.readFileSync(filePath);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Image introuvable", { status: 404 });
  }
}
