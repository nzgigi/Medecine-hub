import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matiere, annee, qcmData } = body;

    if (!matiere || !annee || !qcmData) {
      return NextResponse.json(
        {
          success: false,
          message: "Données manquantes (matiere, annee ou qcmData)",
        },
        { status: 400 }
      );
    }

    const dirPath = path.join(process.cwd(), "public", "data", "qcm");
    const filePath = path.join(dirPath, `${matiere}_${annee}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Sauvegarder le fichier QCM
    fs.writeFileSync(filePath, JSON.stringify(qcmData, null, 2), "utf-8");

    // ✅ AUTO-SYNC : Mettre à jour l'index.json automatiquement
    try {
      const indexPath = path.join(dirPath, "index.json");
      
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        
        const indexEntry = indexData.find(
          (item: any) => item.slug === matiere && item.annee === parseInt(annee)
        );

        if (indexEntry) {
          indexEntry.total_questions = qcmData.total_questions;
          fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), "utf-8");
          console.log(`✅ Index mis à jour: ${matiere} ${annee} → ${qcmData.total_questions} questions`);
        }
      }
    } catch (indexError) {
      console.error("Erreur mise à jour index:", indexError);
      // On ne fait pas échouer la sauvegarde si l'index échoue
    }

    return NextResponse.json({
      success: true,
      message: "QCM sauvegardé avec succès",
    });
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la sauvegarde",
      },
      { status: 500 }
    );
  }
}
