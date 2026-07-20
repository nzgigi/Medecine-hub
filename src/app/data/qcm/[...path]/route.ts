import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";

/**
 * Filet de secours pour /data/qcm/*.json.
 *
 * En production (`next start`), Next.js met en cache la liste des fichiers
 * de `public/` au démarrage du serveur pour accélérer le routage. Un fichier
 * QCM créé ou modifié après ce démarrage (via les routes admin, qui écrivent
 * directement sur disque) devient alors invisible pour le serveur statique
 * tant que le process n'est pas redémarré, et /data/qcm/xxx.json renvoie un
 * 404 alors même que le fichier existe bien sur disque.
 *
 * Cette route dynamique ne s'active que quand le serveur statique n'a pas
 * trouvé le fichier (sinon il répond directement, plus vite) : elle relit le
 * disque à chaque requête, donc toujours à jour.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;
    const qcmDir = safeJoinInside(process.cwd(), "public", "data", "qcm");
    const filePath = safeJoinInside(qcmDir, ...segments);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json(
        { success: false, message: "Fichier introuvable" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Fichier introuvable" },
      { status: 404 }
    );
  }
}
