import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";

/**
 * Filet de secours pour /images/users/**, même raison que
 * src/app/images/qcm/[...path]/route.ts : un avatar uploadé après le
 * démarrage du serveur en production peut être invisible pour le serveur
 * statique tant que le process n'est pas redémarré.
 */
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;
    const avatarRoot = safeJoinInside(process.cwd(), "public", "images", "users");
    const filePath = safeJoinInside(avatarRoot, ...segments);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new NextResponse("Avatar introuvable", { status: 404 });
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
    return new NextResponse("Avatar introuvable", { status: 404 });
  }
}
