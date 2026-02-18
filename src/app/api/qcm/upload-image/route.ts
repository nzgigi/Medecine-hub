import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const slug = formData.get("slug") as string;
    const annee = formData.get("annee") as string;
    const questionId = formData.get("questionId") as string;

    if (!file || !slug || !annee || !questionId) {
      return NextResponse.json({ success: false, message: "Paramètres manquants" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dossier de destination dans /public
    const dir = path.join(process.cwd(), "public", "images", "qcm", slug, annee);
    await mkdir(dir, { recursive: true });

    const ext = file.name.split(".").pop() || "webp";
    const filename = `q${questionId}.${ext}`;
    const filepath = path.join(dir, filename);

    await writeFile(filepath, buffer);

    const publicPath = `/images/qcm/${slug}/${annee}/${filename}`;
    return NextResponse.json({ success: true, path: publicPath });
  } catch (error) {
    console.error("Erreur upload image:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
