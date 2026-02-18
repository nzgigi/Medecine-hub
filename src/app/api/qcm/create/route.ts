import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, matiere, annee } = body as {
      slug: string;
      matiere: string;
      annee: number;
    };

    if (!slug || !matiere || !annee) {
      return NextResponse.json(
        { success: false, message: "matiere, slug et année sont requis" },
        { status: 400 }
      );
    }

    const publicDir = path.join(process.cwd(), "public");
    const qcmDir = path.join(publicDir, "data", "qcm");

    if (!fs.existsSync(qcmDir)) {
      fs.mkdirSync(qcmDir, { recursive: true });
    }

    // 1) créer le fichier qcm si besoin
    const fileName = `${slug}_${annee}.json`;
    const qcmPath = path.join(qcmDir, fileName);

    let totalQuestions = 0;

    if (!fs.existsSync(qcmPath)) {
      const emptyQCM = {
        matiere,
        annee,
        total_questions: 0,
        questions: [] as any[],
      };
      fs.writeFileSync(qcmPath, JSON.stringify(emptyQCM, null, 2), "utf-8");
    } else {
      // si le fichier existe déjà, on lit son total_questions
      const raw = fs.readFileSync(qcmPath, "utf-8");
      const parsed = JSON.parse(raw);
      totalQuestions = parsed.total_questions || 0;
    }

    // 2) mettre à jour index.json (ton format tableau)
    const indexPath = path.join(qcmDir, "index.json");
    let indexData: IndexEntry[] = [];

    if (fs.existsSync(indexPath)) {
      const rawIndex = fs.readFileSync(indexPath, "utf-8");
      indexData = JSON.parse(rawIndex);
    }

    const existingIndex = indexData.find(
      (e) => e.slug === slug && e.annee === annee
    );

    if (existingIndex) {
      existingIndex.matiere = matiere;
      existingIndex.total_questions = totalQuestions;
    } else {
      indexData.push({
        matiere,
        slug,
        annee,
        total_questions: totalQuestions,
      });
    }

    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Erreur création QCM:", e);
    return NextResponse.json(
      { success: false, message: e.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
